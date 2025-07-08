#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { decodeJwt } from './commands/jwt.js';
import { convertCurrency } from './commands/currency.js';
import { sendNotification } from './commands/notify.js';
import { createPr, approvePr, listMyPrs, listMyRepos } from './commands/pr.js';
import { getWeeklyCalendarForAI, getDailyCalendarForAI, addCalendarEvent } from './commands/calendar.js';
import { startPomodoro, stopPomodoro } from './commands/pomodoro.js';

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
            properties: {
                random_string: { type: 'string', description: 'Dummy parameter for no-parameter tools' }
            },
            required: ['random_string']
        }
    },
    {
        name: 'list_my_repos',
        description: 'List all repositories you have access to',
        inputSchema: {
            type: 'object',
            properties: {
                random_string: { type: 'string', description: 'Dummy parameter for no-parameter tools' }
            },
            required: ['random_string']
        }
    },
    {
        name: 'list_weekly_meetings',
        description: 'List all Google Calendar meetings for this week',
        inputSchema: {
            type: 'object',
            properties: {
                random_string: { type: 'string', description: 'Dummy parameter for no-parameter tools' }
            },
            required: ['random_string']
        }
    },
    {
        name: 'list_today_meetings',
        description: 'List all Google Calendar meetings for today',
        inputSchema: {
            type: 'object',
            properties: {
                random_string: { type: 'string', description: 'Dummy parameter for no-parameter tools' }
            },
            required: ['random_string']
        }
    },
    {
        name: 'start_pomodoro',
        description: 'Start a Pomodoro timer',
        inputSchema: {
            type: 'object',
            properties: {
                random_string: { type: 'string', description: 'Dummy parameter for no-parameter tools' }
            },
            required: ['random_string']
        }
    },
    {
        name: 'stop_pomodoro',
        description: 'Stop the Pomodoro timer',
        inputSchema: {
            type: 'object',
            properties: {
                random_string: { type: 'string', description: 'Dummy parameter for no-parameter tools' }
            },
            required: ['random_string']
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

// Helper function to create MCP-compliant response
function createResponse(data) {
    // Handle null/undefined data
    if (data === null || data === undefined) {
        data = { error: 'No data returned' };
    }

    // Convert to string
    let text;
    if (typeof data === 'string') {
        text = data;
    } else {
        try {
            text = JSON.stringify(data);
        } catch (error) {
            text = JSON.stringify({ error: 'Serialization failed' });
        }
    }

    // Ensure text is valid
    if (typeof text !== 'string' || text === '') {
        text = JSON.stringify({ error: 'Invalid data' });
    }

    return {
        content: [{
            type: 'text',
            text: text
        }]
    };
}

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
                const jwtResult = await decodeJwt(args.token);
                return createResponse(jwtResult);

            case 'convert_currency':
                const result = await convertCurrency(args.amount, { from: args.from, to: args.to });
                return createResponse(result);

            case 'send_notification':
                await sendNotification(args.message, { title: args.title });
                return createResponse('Notification sent successfully');

            case 'create_github_pr':
                const prResult = await createPr({
                    source: args.source,
                    target: args.target,
                    title: args.title,
                    body: args.body,
                    reviewers: args.reviewers
                });
                return createResponse(prResult);

            case 'approve_github_pr':
                const approveResult = await approvePr(args.pr, {
                    comment: args.comment,
                    all: args.all
                });
                return createResponse(approveResult);

            case 'list_my_prs':
                const myPrs = await listMyPrs();
                return createResponse(myPrs);

            case 'list_my_repos':
                const myRepos = await listMyRepos();
                return createResponse(myRepos);

            case 'list_weekly_meetings':
                const weeklyMeetings = await getWeeklyCalendarForAI();
                return createResponse(weeklyMeetings || { events: [], summary: 'No events found' });

            case 'list_today_meetings':
                const todayMeetings = await getDailyCalendarForAI();
                return createResponse(todayMeetings || { events: [], summary: 'No events found' });

            case 'start_pomodoro':
                startPomodoro();
                return createResponse('Pomodoro timer started');

            case 'stop_pomodoro':
                stopPomodoro();
                return createResponse('Pomodoro timer stopped');

            case 'add_calendar_event':
                const eventResult = await addCalendarEvent(args.summary, args.startTime, args.endTime, args.description, args.location, args.attendees);
                return createResponse(eventResult);

            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error) {
        return createResponse({
            error: error?.message || 'Unknown error',
            tool: name
        });
    }
});

// Start server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch(console.error); 