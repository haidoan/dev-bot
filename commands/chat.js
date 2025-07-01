import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import ora from 'ora';
import chalk from 'chalk';
import simpleGit from 'simple-git';
import octokit from '../lib/github.js';

dotenv.config();
const git = simpleGit();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash-latest',
    systemInstruction: `You are a helpful AI assistant for a software developer.
    You have access to a set of tools to help the user with their tasks.
    When a user asks for something, first determine if a tool can be used.
    If a tool is appropriate, use it. Otherwise, respond to the user directly.
    If you use a tool, explain what you did and the result.`,
});

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

const tools = {
    async summarize_code_changes({ since = '1 day ago' }) {
        const diff = await git.diff(['--stat', `HEAD@{${
since}}`]);
        return { summary: `Here are the file changes since ${since}:\n${diff}` };
    },
    async create_pr({ target_branch, reviewers, title }) {
        const { owner, repo } = await getRepoInfo();
        const sourceBranch = (await git.branchLocal()).current;
        await git.push('origin', sourceBranch, { '--set-upstream': null });
        const { data: pr } = await octokit.pulls.create({
            owner,
            repo,
            title,
            body: 'Please review this PR.',
            head: sourceBranch,
            base: target_branch,
        });
        if (reviewers) {
            await octokit.pulls.requestReviewers({
                owner,
                repo,
                pull_number: pr.number,
                reviewers: reviewers.split(','),
            });
        }
        return { pr_url: pr.html_url };
    }
};

async function chat(prompt) {
    const spinner = ora('Thinking...').start();
    try {
        const chat = model.startChat({ tools: [
            { functionDeclarations: [
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
                }
            ]}
        ]});

        const result = await chat.sendMessage(prompt);
        const call = result.response.functionCalls()?.[0];

        if (call) {
            const { name, args } = call;
            spinner.text = `Using tool: ${name}...`;
            const result = await tools[name](args);
            spinner.succeed(`Tool ${name} finished.`);
            console.log(chalk.green(JSON.stringify(result, null, 2)));
        } else {
            spinner.succeed('Done!');
            console.log(chalk.green(result.response.text()));
        }

    } catch (error) {
        spinner.fail('Error');
        console.error(chalk.red(error.message));
    }
}


export default function (program) {
  program
    .command('chat <prompt>')
    .description('Chat with the Gemini API (with function calling)')
    .action(chat);
}
