import { createPr, approvePr } from '../commands/pr.js';
import { decodeJwt } from '../commands/jwt.js';
import { convertCurrency } from '../commands/currency.js';

export const commandRegistry = [
    {
        name: 'pr create',
        description: 'Create a new pull request',
        action: createPr,
        options: [
            { flag: '-s, --source <branch>', description: 'Source branch (defaults to current branch)' },
            { flag: '-t, --target <branch>', description: 'Target branch (default: develop)' },
            { flag: '--title <title>', description: 'PR title' },
            { flag: '--body <body>', description: 'PR body' },
            { flag: '-r, --reviewers <reviewers>', description: 'Comma-separated list of reviewers' },
        ],
    },
    {
        name: 'pr approve',
        description: 'Approve a pull request',
        action: approvePr,
        args: [{ name: '[pr_number]', description: 'The pull request number' }],
        options: [
            { flag: '-c, --comment <body>', description: 'Review comment' },
        ],
    },
    {
        name: 'jwt',
        description: 'Decode a JWT token',
        action: decodeJwt,
        args: [{ name: '<token>', description: 'The JWT token to decode' }],
    },
    {
        name: 'currency',
        description: 'Convert currency using Vietcombank rates',
        action: convertCurrency,
        args: [{ name: '<amount>', description: 'Amount to convert' }],
        options: [
            { flag: '-f, --from <currency>', description: 'From currency' },
            { flag: '-t, --to <currency>', description: 'To currency' },
        ],
    }
];