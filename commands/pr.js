import simpleGit from 'simple-git';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import octokit from '../lib/github.js';

const git = simpleGit();

function formatPrBody(body) {
    // replace all ; with - \n
    return `- [x] ${body}`.replace(/;/g, '\n- [x]');
}

async function getCurrentUser() {
    const { data: user } = await octokit.rest.users.getAuthenticated();
    return user.login;
}

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

async function getReviewers() {
    const { owner, repo } = await getCurrentRepo();
    const { data: collaborators } = await octokit.rest.repos.listCollaborators({
        owner,
        repo,
    });
    return collaborators.map(c => c.login);
}

export async function listReviewers() {
    const spinner = ora('Fetching reviewers...').start();
    try {
        const reviewers = await getReviewers();
        spinner.succeed('Available reviewers:');
        reviewers.forEach(r => console.log(`- ${r}`));
    } catch (error) {
        spinner.fail('Failed to fetch reviewers.');
        console.error(chalk.red(error.message));
    }
}

export async function createPr(options) {
    if (options.list) {
        await listReviewers();
        return;
    }

    const spinner = ora('Gathering details...').start();
    try {
        const { owner, repo } = await getCurrentRepo();
        const sourceBranch = options.source || (await git.branchLocal()).current;
        const targetBranch = options.target || 'develop';

        if (sourceBranch === targetBranch) {
            spinner.fail(`Source branch (${sourceBranch}) and target branch (${targetBranch}) cannot be the same.`);
            return;
        }

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
        let reviewers = options.reviewers;

        spinner.stop();

        if (!reviewers) {
            const allReviewers = await getReviewers();
            const currentUser = await getCurrentUser();
            const { selectedReviewers } = await inquirer.prompt([
                {
                    type: 'checkbox',
                    name: 'selectedReviewers',
                    message: 'Select reviewers:',
                    choices: allReviewers.filter(r => r !== currentUser),
                }
            ]);
            reviewers = selectedReviewers.join(',');
        }

        console.log(chalk.bold('You are about to create a new pull request with these details:'));
        console.log(`  ${chalk.bold('Source:')}      ${sourceBranch}`);
        console.log(`  ${chalk.bold('Target:')}      ${targetBranch}`);
        console.log(`  ${chalk.bold('Title:')}       ${title}`);
        console.log(`  ${chalk.bold('Body:')}        ${body}`);
        if (reviewers) {
            console.log(`  ${chalk.bold('Reviewers:')}   ${reviewers}`);
        }
        console.log('');

        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: 'Do you want to proceed?',
                default: true,
            }
        ]);

        if (!confirm) {
            console.log(chalk.yellow('PR creation cancelled.'));
            return;
        }

        spinner.start('Creating pull request...');

        spinner.text = 'Verifying target branch on remote...';
        await git.fetch();
        const branches = await git.branch(['-r']);
        if (!branches.all.includes(`origin/${targetBranch}`)) {
            throw new Error(`Target branch '${targetBranch}' does not exist on the remote repository. Please check the branch name.`);
        }

        spinner.text = `Pushing branch ${sourceBranch}...`;
        await git.push('origin', sourceBranch, { '--set-upstream': null });

        spinner.text = 'Creating pull request on GitHub...';
        const { data: pr } = await octokit.rest.pulls.create({
            owner,
            repo,
            title,
            body: formatPrBody(body),
            head: sourceBranch,
            base: targetBranch,
        });

        if (reviewers) {
            spinner.text = 'Requesting reviewers...';
            await octokit.rest.pulls.requestReviewers({
                owner,
                repo,
                pull_number: pr.number,
                reviewers: reviewers.split(','),
            });
        }

        spinner.succeed('Pull request created successfully!');
        console.log(chalk.green(pr.html_url));

    } catch (error) {
        spinner.fail('Failed to create pull request.');
        console.error(chalk.red(error.message));
    }
}

export async function approvePrNonInteractive(prNumber, comment) {
    const { owner, repo } = await getCurrentRepo();
    await octokit.rest.pulls.createReview({
        owner,
        repo,
        pull_number: prNumber,
        event: 'APPROVE',
        body: comment,
    });
    return { success: true, message: `Pull request #${prNumber} approved successfully.` };
}

export async function approvePr(prNumber, options) {
    const spinner = ora('Approving pull request...').start();
    try {
        const { owner, repo } = await getCurrentRepo();
        let pullNumber = prNumber;

        if (!pullNumber) {
            spinner.text = 'Fetching pull requests...';
            const currentUser = await getCurrentUser();
            const { data: prs } = await octokit.rest.pulls.list({ owner, repo, state: 'open' });

            let prsToReview = prs;
            if (!options.all) {
                prsToReview = prs.filter(pr =>
                    pr.requested_reviewers.some(reviewer => reviewer.login === currentUser)
                );
            }

            spinner.stop();

            if (prsToReview.length === 0) {
                const message = options.all
                    ? 'No open pull requests found.'
                    : `No pull requests found for you to review. Use the ${chalk.bold('--all')} flag to see all open PRs.`;
                console.log(chalk.yellow(message));
                return;
            }

            const { selectedPr } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'selectedPr',
                    message: 'Select a pull request to approve:',
                    choices: prsToReview.map(pr => ({
                        name: `#${pr.number}: ${pr.title}`,
                        value: pr.number,
                    })),
                },
            ]);
            pullNumber = selectedPr;
        }

        spinner.start('Fetching PR details...');
        const { data: pr } = await octokit.rest.pulls.get({
            owner,
            repo,
            pull_number: pullNumber,
        });

        console.log(`\n${chalk.bold('PR Details:')}`);
        console.log(`  ${chalk.bold('Title:')} ${pr.title}`);
        console.log(`  ${chalk.bold('Author:')} ${pr.user.login}`);
        console.log(`  ${chalk.bold('URL:')} ${pr.html_url}`);
        console.log(`  ${chalk.bold('Body:')}\n${pr.body || 'No description provided.'}\n`);

        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: 'Are you sure you want to approve this pull request?',
                default: true,
            }
        ]);

        if (!confirm) {
            spinner.info('Approval cancelled.');
            return;
        }

        spinner.start('Approving pull request...');
        await approvePrNonInteractive(pullNumber, options.comment);
        spinner.succeed(`Pull request #${pullNumber} approved successfully!`);

    } catch (error) {
        spinner.fail('Failed to approve pull request.');
        console.error(chalk.red(error.message));
    }
}

export async function listMyRepos() {
    const spinner = ora('Fetching your repositories...').start();
    try {
        const currentUser = await getCurrentUser();

        // Get all repos (owned, collaborated, and organization member)
        // visibility: 'all' includes both public and private repos
        // Change to 'private' to see only private repos, 'public' for only public
        const [ownedRepos, collaboratedRepos, orgMemberRepos] = await Promise.all([
            octokit.rest.repos.listForAuthenticatedUser({
                visibility: 'all',
                affiliation: 'owner',
                per_page: 100
            }),
            octokit.rest.repos.listForAuthenticatedUser({
                visibility: 'all',
                affiliation: 'collaborator',
                per_page: 100
            }),
            octokit.rest.repos.listForAuthenticatedUser({
                visibility: 'all',
                affiliation: 'organization_member',
                per_page: 100
            })
        ]);

        spinner.stop();

        console.log(chalk.bold(`\nRepositories for ${currentUser}:`));

        if (ownedRepos.data.length > 0) {
            console.log(chalk.cyan('\nOwned repositories:'));
            ownedRepos.data.forEach(repo => {
                console.log(`  - ${repo.full_name} ${repo.private ? '(private)' : '(public)'}`);
            });
        }

        if (collaboratedRepos.data.length > 0) {
            console.log(chalk.cyan('\nCollaborated repositories:'));
            collaboratedRepos.data.forEach(repo => {
                console.log(`  - ${repo.full_name} ${repo.private ? '(private)' : '(public)'}`);
            });
        }

        if (orgMemberRepos.data.length > 0) {
            console.log(chalk.cyan('\nOrganization member repositories:'));
            orgMemberRepos.data.forEach(repo => {
                console.log(`  - ${repo.full_name} ${repo.private ? '(private)' : '(public)'}`);
            });
        }

        const totalRepos = ownedRepos.data.length + collaboratedRepos.data.length + orgMemberRepos.data.length;
        console.log(chalk.green(`\nTotal: ${totalRepos} repositories`));

    } catch (error) {
        spinner.fail('Failed to fetch repositories.');
        console.error(chalk.red(error.message));
    }
}

export async function listMyPrs() {
    const spinner = ora('Fetching your pull requests...').start();
    try {
        const currentUser = await getCurrentUser();
        const query = `is:open is:pr review-requested:${currentUser} archived:false`;

        spinner.text = 'Searching for pull requests assigned to you...';
        const { data: result } = await octokit.request('GET /search/issues', {
            q: query,
            advanced_search: true,
        });

        spinner.stop();

        console.log(`Found ${result.total_count} total PRs in search results`);
        console.log(`Returned ${result.items.length} items`);
        console.log('Repository URLs found:', result.items.map(item => item.repository_url));
        console.log('States:', result.items.map(item => item.state));

        if (result.items.length === 0) {
            console.log(chalk.yellow('No pull requests found for you to review across all repositories.'));
            return;
        }

        const prsByRepo = result.items.reduce((acc, pr) => {
            const repoName = pr.repository_url.split('/').slice(-2).join('/');
            if (!acc[repoName]) {
                acc[repoName] = [];
            }
            acc[repoName].push(pr);
            return acc;
        }, {});

        console.log(chalk.bold('Pull requests assigned to you:'));
        for (const repoName in prsByRepo) {
            console.log(chalk.cyan(`\nRepository: ${repoName}`));
            prsByRepo[repoName].forEach(pr => {
                console.log(`  #${pr.number}: ${pr.title} (${pr.html_url})`);
            });
        }

    } catch (error) {
        spinner.fail('Failed to fetch pull requests.');
        console.error(chalk.red(error.message));
    }
}