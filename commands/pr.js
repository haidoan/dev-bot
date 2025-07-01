import { Command } from 'commander';
import simpleGit from 'simple-git';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import octokit from '../lib/github.js';

const git = simpleGit();

async function getCurrentRepo() {
    const remotes = await git.getRemotes(true);
    const origin = remotes.find(r => r.name === 'origin');
    if (!origin) {
        throw new Error('Origin remote not found. Are you in a git repository?');
    }
    const match = origin.refs.fetch.match(/github\.com[/:]([^/]+\/[^/]+)\.git$/);
    if (!match) {
        throw new Error('Could not parse repository owner and name from origin remote.');
    }
    const [owner, repo] = match[1].split('/');
    return { owner, repo };
}

async function createPr(options) {
    const spinner = ora('Creating pull request...').start();
    try {
        const { owner, repo } = await getCurrentRepo();
        const sourceBranch = options.source || (await git.branchLocal()).current;
        const targetBranch = options.target || 'develop';

        let title = options.title;
        if (!title) {
            if (sourceBranch.match(/[a-zA-Z]+-[0-9]+/)) {
                const ticket = sourceBranch.match(/[a-zA-Z]+-[0-9]+/)[0].toUpperCase();
                const description = sourceBranch.split(ticket.toLowerCase() + '-').pop().replace(/-/g, ' ');
                title = `[${ticket}] ${description}`;
            } else {
                title = 'Pull Request';
            }
        }

        const body = options.body || 'Please review this PR.';

        spinner.text = `Pushing branch ${sourceBranch}...`;
        await git.push('origin', sourceBranch, { '--set-upstream': null });

        spinner.text = 'Creating pull request on GitHub...';
        const { data: pr } = await octokit.pulls.create({
            owner,
            repo,
            title,
            body,
            head: sourceBranch,
            base: targetBranch,
        });

        if (options.reviewers) {
            spinner.text = 'Requesting reviewers...';
            await octokit.pulls.requestReviewers({
                owner,
                repo,
                pull_number: pr.number,
                reviewers: options.reviewers.split(','),
            });
        }

        spinner.succeed('Pull request created successfully!');
        console.log(chalk.green(pr.html_url));

    } catch (error) {
        spinner.fail('Failed to create pull request.');
        console.error(chalk.red(error.message));
    }
}

async function approvePr(prNumber, options) {
    const spinner = ora('Approving pull request...').start();
    try {
        const { owner, repo } = await getCurrentRepo();
        let pullNumber = prNumber;

        if (!pullNumber) {
            spinner.text = 'Fetching pull requests...';
            const { data: prs } = await octokit.pulls.list({ owner, repo, state: 'open' });
            spinner.stop();

            if (prs.length === 0) {
                console.log(chalk.yellow('No open pull requests found.'));
                return;
            }

            const { selectedPr } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'selectedPr',
                    message: 'Select a pull request to approve:',
                    choices: prs.map(pr => ({
                        name: `#${pr.number}: ${pr.title}`,
                        value: pr.number,
                    })),
                },
            ]);
            pullNumber = selectedPr;
        }
        
        spinner.start('Approving pull request...');
        await octokit.pulls.createReview({
            owner,
            repo,
            pull_number: pullNumber,
            event: 'APPROVE',
            body: options.comment,
        });

        spinner.succeed(`Pull request #${pullNumber} approved successfully!`);

    } catch (error) {
        spinner.fail('Failed to approve pull request.');
        console.error(chalk.red(error.message));
    }
}


export default function (program) {
    const prCommand = program.command('pr')
        .description('Manage GitHub pull requests');

    prCommand
        .command('create')
        .description('Create a new pull request')
        .option('-s, --source <branch>', 'Source branch (defaults to current branch)')
        .option('-t, --target <branch>', 'Target branch (default: develop)')
        .option('--title <title>', 'PR title')
        .option('--body <body>', 'PR body')
        .option('-r, --reviewers <reviewers>', 'Comma-separated list of reviewers')
        .action(createPr);

    prCommand
        .command('approve [pr_number]')
        .description('Approve a pull request')
        .option('-c, --comment <body>', 'Review comment')
        .action(approvePr);
}
