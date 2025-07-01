import simpleGit from 'simple-git';
import octokit from './github.js';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import notifier from 'node-notifier';

const git = simpleGit();

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

// Tool implementations
const tools = {
    async summarize_code_changes({ since = '1 day ago' }) {
        const diff = await git.diff(['--stat', `HEAD@{${since}}`]);
        return { summary: `Here are the file changes since ${since}:\n${diff}` };
    },

    async create_pr({ target_branch = 'develop', reviewers, title }) {
        const { owner, repo } = await getRepoInfo();
        const sourceBranch = (await git.branchLocal()).current;
        
        // Auto-generate title if not provided
        if (!title) {
            if (sourceBranch.match(/[a-zA-Z]+-[0-9]+/)) {
                const ticket = sourceBranch.match(/[a-zA-Z]+-[0-9]+/)[0].toUpperCase();
                const description = sourceBranch.split(ticket.toLowerCase() + '-').pop().replace(/-/g, ' ');
                title = `[${ticket}] ${description}`;
            } else {
                title = 'Pull Request';
            }
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
                reviewers: reviewers.split(',').map(r => r.trim()),
            });
        }
        return { pr_url: pr.html_url, pr_number: pr.number };
    },

    async approve_pr({ pr_number, comment = 'LGTM! 👍' }) {
        const { owner, repo } = await getRepoInfo();
        let pullNumber = pr_number;

        if (!pullNumber) {
            const { data: prs } = await octokit.rest.pulls.list({ owner, repo, state: 'open' });
            if (prs.length === 0) {
                return { error: 'No open pull requests found.' };
            }
            // Get the most recent PR
            pullNumber = prs[0].number;
        }

        await octokit.rest.pulls.createReview({
            owner,
            repo,
            pull_number: pullNumber,
            event: 'APPROVE',
            body: comment,
        });

        return { message: `Pull request #${pullNumber} approved successfully!` };
    },

    async get_currency_rate({ from_currency = 'USD', to_currency = 'VND', amount = 1 }) {
        const VCB_API_URL = 'https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx';
        
        try {
            const { data } = await axios.get(VCB_API_URL);
            const rates = {};
            const regex = /<Exrate CurrencyCode="(\w+)" CurrencyName="([^"]+)" Buy="([^"]*)" Transfer="([^"]*)" Sell="([^"]*)"[^>]*\/>/g;
            let match;
            while ((match = regex.exec(data)) !== null) {
                const buyValue = match[3] === '-' ? 0 : parseFloat(match[3].replace(/,/g, ''));
                const transferValue = match[4] === '-' ? 0 : parseFloat(match[4].replace(/,/g, ''));
                const sellValue = match[5] === '-' ? 0 : parseFloat(match[5].replace(/,/g, ''));
                
                rates[match[1]] = {
                    name: match[2].trim(),
                    buy: buyValue || transferValue, // Use transfer if buy is not available
                    transfer: transferValue,
                    sell: sellValue || transferValue, // Use transfer if sell is not available
                };
            }

            const fromRate = rates[from_currency];
            const toRate = rates[to_currency];

            if (from_currency !== 'VND' && !fromRate) {
                return { error: `Currency ${from_currency} not found.` };
            }
            if (to_currency !== 'VND' && !toRate) {
                return { error: `Currency ${to_currency} not found.` };
            }

            let result;
            if (from_currency === 'VND') {
                result = amount / toRate.sell;
            } else if (to_currency === 'VND') {
                result = amount * fromRate.buy;
            } else {
                const inVnd = amount * fromRate.buy;
                result = inVnd / toRate.sell;
            }

            return { 
                amount: amount,
                from: from_currency,
                to: to_currency,
                result: result.toFixed(2),
                rate: from_currency === 'VND' ? toRate.sell : fromRate.buy
            };
        } catch (error) {
            return { error: 'Failed to fetch exchange rates.' };
        }
    },

    async decode_jwt({ token }) {
        try {
            const decoded = jwt.decode(token, { complete: true });
            if (!decoded) {
                return { error: 'Invalid JWT token' };
            }
            return {
                header: decoded.header,
                payload: decoded.payload,
                message: 'JWT decoded successfully'
            };
        } catch (error) {
            return { error: 'Failed to decode JWT token' };
        }
    },

    async send_notification({ message, title = 'Bot Notification' }) {
        return new Promise((resolve) => {
            notifier.notify(
                {
                    title: title,
                    message: message,
                    sound: true,
                    wait: false
                },
                function (err, response) {
                    if (err) {
                        resolve({ error: `Notification error: ${err.message}` });
                    } else {
                        resolve({ message: 'Notification sent successfully!' });
                    }
                }
            );
        });
    },

    async list_open_prs() {
        try {
            const { owner, repo } = await getRepoInfo();
            const { data: prs } = await octokit.rest.pulls.list({ owner, repo, state: 'open' });
            
            return {
                count: prs.length,
                prs: prs.map(pr => ({
                    number: pr.number,
                    title: pr.title,
                    author: pr.user.login,
                    created: pr.created_at,
                    url: pr.html_url
                }))
            };
        } catch (error) {
            return { error: 'Failed to fetch pull requests.' };
        }
    }
};

// Tool definitions for Gemini AI
const toolDefinitions = [
    {
        name: 'summarize_code_changes',
        description: 'Get a summary of code changes in the current git repository since a specific time.',
        parameters: {
            type: 'OBJECT',
            properties: {
                since: { type: 'STRING', description: 'Timeframe to summarize (e.g., "1 day ago", "2 weeks ago", "yesterday")' }
            },
            required: []
        }
    },
    {
        name: 'create_pr',
        description: 'Create a GitHub pull request from current branch.',
        parameters: {
            type: 'OBJECT',
            properties: {
                target_branch: { type: 'STRING', description: 'The branch to merge into (default: develop)' },
                reviewers: { type: 'STRING', description: 'Comma-separated list of reviewer usernames' },
                title: { type: 'STRING', description: 'The title of the pull request (auto-generated if not provided)' }
            },
            required: []
        }
    },
    {
        name: 'approve_pr',
        description: 'Approve a GitHub pull request.',
        parameters: {
            type: 'OBJECT',
            properties: {
                pr_number: { type: 'NUMBER', description: 'The pull request number to approve (if not provided, approves the most recent open PR)' },
                comment: { type: 'STRING', description: 'Review comment (default: "LGTM! 👍")' }
            },
            required: []
        }
    },
    {
        name: 'get_currency_rate',
        description: 'Get current exchange rate and convert between currencies using Vietnamese bank rates.',
        parameters: {
            type: 'OBJECT',
            properties: {
                from_currency: { type: 'STRING', description: 'Source currency code (default: USD)' },
                to_currency: { type: 'STRING', description: 'Target currency code (default: VND)' },
                amount: { type: 'NUMBER', description: 'Amount to convert (default: 1)' }
            },
            required: []
        }
    },
    {
        name: 'decode_jwt',
        description: 'Decode a JWT token and show its header and payload.',
        parameters: {
            type: 'OBJECT',
            properties: {
                token: { type: 'STRING', description: 'The JWT token to decode' }
            },
            required: ['token']
        }
    },
    {
        name: 'send_notification',
        description: 'Send a desktop notification to the user.',
        parameters: {
            type: 'OBJECT',
            properties: {
                message: { type: 'STRING', description: 'The notification message' },
                title: { type: 'STRING', description: 'The notification title (default: "Bot Notification")' }
            },
            required: ['message']
        }
    },
    {
        name: 'list_open_prs',
        description: 'List all open pull requests in the current repository.',
        parameters: {
            type: 'OBJECT',
            properties: {},
            required: []
        }
    }
];

export { tools, toolDefinitions };