#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { decodeJwt } from './commands/jwt.js';
import { convertCurrency } from './commands/currency.js';
import { sendNotification } from './commands/notify.js';
import { createPr, approvePr, listMyPrs, listMyRepos } from './commands/pr.js';
import { listWeeklyMeetings, listTodayMeetings, addCalendarEvent } from './commands/calendar.js';
import { startPomodoro, stopPomodoro } from './commands/pomodoro.js';
import interactiveChat from './commands/interactive.js';

const server = new Server({
    name: 'bot-mcp-server',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    },
});

// Define available tools
const tools = [
    {
        name: 'decode_jwt',
        description: 'Decode a JWT token and return its payload',
        inputSchema: {
            type: 'object',
            properties: {
                token: { type: 'string', description: 'JWT token to decode' }
            },
            required: ['token']
        }
    },
    {
        name: 'convert_currency',
        description: 'Convert currency using Vietcombank rates',
        inputSchema: {
            type: 'object',
            properties: {
                amount: { type: 'number', description: 'Amount to convert' },
                from: { type: 'string', description: 'Source currency code' },
                to: { type: 'string', description: 'Target currency code' }
            },
            required: ['amount', 'from', 'to']
        }
    },
    {
        name: 'send_notification',
        description: 'Send a desktop notification',
        inputSchema: {
            type: 'object',
            properties: {
                message: { type: 'string', description: 'Notification message' },
                title: { type: 'string', description: 'Notification title' }
            },
            required: ['message']
        }
    },
    {
        name: 'create_github_pr',
        description: 'Create a GitHub pull request',
        inputSchema: {
            type: 'object',
            properties: {
                source: { type: 'string', description: 'Source branch' },
                target: { type: 'string', description: 'Target branch' },
                title: { type: 'string', description: 'PR title' },
                body: { type: 'string', description: 'PR body' },
                reviewers: { type: 'string', description: 'Comma-separated reviewers' }
            }
        }
    },
    {
        name: 'approve_github_pr',
        description: 'Approve a GitHub pull request',
        inputSchema: {
            type: 'object',
            properties: {
                pr: { type: 'string', description: 'PR number or URL' },
                comment: { type: 'string', description: 'Review comment' },
                all: { type: 'boolean', description: 'Show all open PRs' }
            }
        }
    },
    {
        name: 'list_my_prs',
        description: 'List all pull requests assigned to you',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },
    {
        name: 'list_my_repos',
        description: 'List all repositories you have access to',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },
    {
        name: 'list_weekly_meetings',
        description: 'List all Google Calendar meetings for this week',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },
    {
        name: 'list_today_meetings',
        description: 'List all Google Calendar meetings for today',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },
    {
        name: 'start_pomodoro',
        description: 'Start a Pomodoro timer',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },
    {
        name: 'stop_pomodoro',
        description: 'Stop the Pomodoro timer',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },
    {
        name: 'add_calendar_event',
        description: 'Add a new event to the Google Calendar',
        inputSchema: {
            type: 'object',
            properties: {
                summary: { type: 'string', description: 'Event summary or title' },
                startTime: { type: 'string', description: 'Event start time in ISO 8601 format' },
                endTime: { type: 'string', description: 'Event end time in ISO 8601 format' },
                description: { type: 'string', description: 'Event description' },
                location: { type: 'string', description: 'Event location' },
                attendees: { type: 'string', description: 'Comma-separated list of attendee emails' }
            },
            required: ['summary', 'startTime', 'endTime']
        }
    }
];

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        switch (name) {
            case 'decode_jwt':
                return {
                    content: [{ type: 'text', text: JSON.stringify(await decodeJwt(args.token)) }]
                };

            case 'convert_currency':
                const result = await convertCurrency(args.amount, { from: args.from, to: args.to });
                return {
                    content: [{ type: 'text', text: JSON.stringify(result) }]
                };

            case 'send_notification':
                await sendNotification(args.message, { title: args.title });
                return {
                    content: [{ type: 'text', text: 'Notification sent successfully' }]
                };

            case 'create_github_pr':
                const prResult = await createPr({
                    source: args.source,
                    target: args.target,
                    title: args.title,
                    body: args.body,
                    reviewers: args.reviewers
                });
                return {
                    content: [{ type: 'text', text: JSON.stringify(prResult) }]
                };

            case 'approve_github_pr':
                const approveResult = await approvePr(args.pr, {
                    comment: args.comment,
                    all: args.all
                });
                return {
                    content: [{ type: 'text', text: JSON.stringify(approveResult) }]
                };

            case 'list_my_prs':
                const myPrs = await listMyPrs();
                return {
                    content: [{ type: 'text', text: JSON.stringify(myPrs) }]
                };

            case 'list_my_repos':
                const myRepos = await listMyRepos();
                return {
                    content: [{ type: 'text', text: JSON.stringify(myRepos) }]
                };

            case 'list_weekly_meetings':
                const weeklyMeetings = await listWeeklyMeetings();
                return {
                    content: [{ type: 'text', text: JSON.stringify(weeklyMeetings) }]
                };

            case 'list_today_meetings':
                const todayMeetings = await listTodayMeetings();
                return {
                    content: [{ type: 'text', text: JSON.stringify(todayMeetings) }]
                };

            case 'start_pomodoro':
                startPomodoro();
                return {
                    content: [{ type: 'text', text: 'Pomodoro timer started' }]
                };

            case 'stop_pomodoro':
                stopPomodoro();
                return {
                    content: [{ type: 'text', text: 'Pomodoro timer stopped' }]
                };

            case 'add_calendar_event':
                const eventResult = await addCalendarEvent(args.summary, args.startTime, args.endTime, args.description, args.location, args.attendees);
                return {
                    content: [{ type: 'text', text: JSON.stringify(eventResult) }]
                };

            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error) {
        return {
            content: [{
                type: 'text',
                text: `Error executing ${name}: ${error.message}`
            }],
            isError: true
        };
    }
});

// Start server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch(console.error); 