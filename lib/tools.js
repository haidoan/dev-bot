import simpleGit from 'simple-git';
import octokit from './github.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
    }
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
    }
];