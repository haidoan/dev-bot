import simpleGit from 'simple-git';
import octokit from './github.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as jwt from 'jsonwebtoken';
import * as notifier from 'node-notifier';
import axios from 'axios';
import { approvePrNonInteractive } from '../commands/pr.js';
import { getWeeklyCalendarForAI, getDailyCalendarForAI } from '../commands/calendar.js';

const git = simpleGit();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function getRepoInfo() {
    const remotes = await git.getRemotes(true);
    const origin = remotes.find(r => r.name === 'origin');
    if (!origin) {
        throw new Error('Origin remote not found.');
    }
    const match = origin.refs.fetch.match(/github\.com[/:]([^/]+\/[^/]+)\.git$/);
    if (!match) {
        throw new Error('Could not parse repository owner and name.');
    }
    const [owner, repo] = match[1].split('/');
    return { owner, repo };
}

export const tools = {
    async summarize_code_changes({ since = '1 day ago' }) {
        const diff = await git.diff(['--stat', `HEAD@{${since}}`]);
        return { summary: `Here are the file changes since ${since}:
${diff}` };
    },
    async create_pr({ target_branch, reviewers, title }) {
        const { owner, repo } = await getRepoInfo();
        const sourceBranch = (await git.branchLocal()).current;
        if (sourceBranch === target_branch) {
            throw new Error(`Source branch (${sourceBranch}) and target branch (${target_branch}) cannot be the same.`);
        }
        await git.fetch();
        const branches = await git.branch(['-r']);
        if (!branches.all.includes(`origin/${target_branch}`)) {
            throw new Error(`Target branch '${target_branch}' does not exist on the remote repository. Please check the branch name.`);
        }
        await git.push('origin', sourceBranch, { '--set-upstream': null });
        const { data: pr } = await octokit.rest.pulls.create({
            owner,
            repo,
            title,
            body: 'Please review this PR.',
            head: sourceBranch,
            base: target_branch,
        });
        if (reviewers) {
            await octokit.rest.pulls.requestReviewers({
                owner,
                repo,
                pull_number: pr.number,
                reviewers: reviewers.split(','),
            });
        }
        return { pr_url: pr.html_url };
    },
    async review_pr({ pr_number }) {
        const { owner, repo } = await getRepoInfo();
        const { data: diff } = await octokit.rest.pulls.get({
            owner,
            repo,
            pull_number: pr_number,
            mediaType: {
                format: 'diff'
            }
        });

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
        const prompt = `You are an expert senior software engineer. Please review the following code diff from a pull request and provide a summary.
        Use markdown bold syntax for headings (e.g., **Overall Purpose**).
        Focus on:
        - The overall purpose of the changes.
        - Potential bugs or edge cases.
        - Security vulnerabilities.
        - Performance issues.
        - Code style and readability.
        - Test coverage.

        Diff:
        ${diff}
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return { summary: response.text() };
    },
    async approve_pr({ pr_number, comment }) {
        try {
            const result = await approvePrNonInteractive(pr_number, comment);
            return result;
        } catch (error) {
            return { success: false, message: `Failed to approve PR: ${error.message}` };
        }
    },
    async decode_jwt({ token }) {
        try {
            const decoded = jwt.decode(token);
            return { decoded_token: decoded };
        } catch (error) {
            return { error: 'Invalid JWT token.' };
        }
    },
    async convert_currency({ from_currency, to_currency, amount = 1 }) {
        try {
            const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${from_currency}`);
            const data = response.data;
            if (data.rates && data.rates[to_currency]) {
                const rate = data.rates[to_currency];
                const converted_amount = amount * rate;
                return {
                    from_currency,
                    to_currency,
                    amount,
                    converted_amount,
                    rate
                };
            } else {
                return { error: 'Could not get exchange rate for the specified currencies.' };
            }
        } catch (error) {
            return { error: `Failed to convert currency: ${error.message}` };
        }
    },
    async send_notification({ title, message }) {
        notifier.notify({
            title: title,
            message: message,
            sound: true,
            wait: true
        });
        return { status: 'Notification sent successfully.' };
    },
    get_weekly_calendar: getWeeklyCalendarForAI,
    get_daily_calendar: getDailyCalendarForAI,
};

export const toolDeclarations = [
    {
        name: 'summarize_code_changes',
        description: 'Get a summary of code changes in the current git repository.',
        parameters: {
            type: 'OBJECT',
            properties: {
                since: { type: 'STRING', description: 'Timeframe to summarize (e.g., "1 day ago", "2 weeks ago").' }
            },
            required: []
        }
    },
    {
        name: 'create_pr',
        description: 'Create a GitHub pull request.',
        parameters: {
            type: 'OBJECT',
            properties: {
                target_branch: { type: 'STRING', description: 'The branch to merge into.' },
                reviewers: { type: 'STRING', description: 'Comma-separated list of reviewer usernames.' },
                title: { type: 'STRING', description: 'The title of the pull request.' }
            },
            required: ['target_branch', 'title']
        }
    },
    {
        name: 'review_pr',
        description: 'Review a pull request and provide a summary.',
        parameters: {
            type: 'OBJECT',
            properties: {
                pr_number: { type: 'NUMBER', description: 'The pull request number.' }
            },
            required: ['pr_number']
        }
    },
    {
        name: 'approve_pr',
        description: 'Approve a GitHub pull request.',
        parameters: {
            type: 'OBJECT',
            properties: {
                pr_number: { type: 'NUMBER', description: 'The pull request number to approve.' },
                comment: { type: 'STRING', description: 'An optional approval comment.' }
            },
            required: ['pr_number']
        }
    },
    {
        name: 'decode_jwt',
        description: 'Decode a JWT token.',
        parameters: {
            type: 'OBJECT',
            properties: {
                token: { type: 'STRING', description: 'The JWT token string to decode.' }
            },
            required: ['token']
        }
    },
    {
        name: 'convert_currency',
        description: 'Convert an amount from one currency to another, or fetch current exchange rates. Example: To get the USD to VND rate, use from_currency: "USD", to_currency: "VND", and optionally amount: 1.',
        parameters: {
            type: 'OBJECT',
            properties: {
                from_currency: { type: 'STRING', description: 'The currency code to convert from (e.g., "USD").' },
                to_currency: { type: 'STRING', description: 'The currency code to convert to (e.g., "VND").' },
                amount: { type: 'NUMBER', description: 'The amount to convert. Defaults to 1 if not provided, to fetch the rate.' }
            },
            required: ['from_currency', 'to_currency']
        }
    },
    {
        name: 'send_notification',
        description: 'Send a desktop notification.',
        parameters: {
            type: 'OBJECT',
            properties: {
                title: { type: 'STRING', description: 'The title of the notification.' },
                message: { type: 'STRING', description: 'The message body of the notification.' }
            },
            required: ['title', 'message']
        }
    },
    {
        name: 'get_weekly_calendar',
        description: 'Get all Google Calendar events for the current week.',
        parameters: {
            type: 'OBJECT',
            properties: {},
            required: []
        }
    },
    {
        name: 'get_daily_calendar',
        description: 'Get all Google Calendar events for today.',
        parameters: {
            type: 'OBJECT',
            properties: {},
            required: []
        }
    }
];