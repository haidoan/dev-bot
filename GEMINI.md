# Gemini CLI Bot

This document provides context for the Gemini CLI Bot, an AI-powered assistant for software development tasks.

## Project Overview

The Gemini CLI Bot is a command-line tool that helps developers with various tasks, including:

- **GitHub Integration:** Manage pull requests (create, approve, review, list).
- **Utilities:** Decode JWTs, convert currency, and send desktop notifications.
- **Google Calendar:** View today's or this week's events.
- **Productivity:** Use a Pomodoro timer.

The bot can be used in two modes:
1.  **Direct CLI Commands:** Run specific commands from the terminal (e.g., `bot pr create`).
2.  **Interactive Chat:** Start an AI chat session (`bot interactive`) where the AI can perform tasks based on natural language requests.

## Key Files

-   `index.js`: The main entry point for the CLI.
-   `mcp-server.js`: Handles the interactive chat mode.
-   `commands/`: Contains the implementation for each CLI command.
-   `lib/`: Contains shared logic, including GitHub API integration (`github.js`), tool definitions for the AI (`tools.js`), and command registration (`commands.js`).
-   `scripts/`: Contains shell scripts for more complex, multi-step operations.

## Available Commands (CLI Mode)

-   `bot pr create [options]`: Create a GitHub pull request.
-   `bot pr approve [pr_number] [options]`: Approve a pull request.
-   `bot pr list-mine`: List your assigned pull requests.
-   `bot calendar today`: List today's Google Calendar events.
-   `bot calendar week`: List this week's Google Calendar events.
-   `bot jwt <token>`: Decode a JWT.
-   `bot currency <amount> [options]`: Convert currency.
-   `bot notify <message> [options]`: Send a desktop notification.
-   `bot interactive`: Start an interactive AI chat session.

## Available Tools (Interactive Mode)

When in interactive mode, the AI has access to the following tools:

-   `summarize_code_changes`: Summarizes file changes from the git history.
-   `create_pr`: Creates a GitHub pull request.
-   `review_pr`: Reviews the code changes in a pull request.
-   `approve_pr`: Approves a pull request.
-   `decode_jwt`: Decodes a JWT.
-   `convert_currency`: Converts currency using the latest exchange rates.
-   `send_notification`: Sends a desktop notification.
-   `get_daily_calendar`: Fetches today's Google Calendar events.
-   `get_weekly_calendar`: Fetches this week's Google Calendar events.
-   `start_pomodoro`: Starts a Pomodoro timer.
-   `stop_pomodoro`: Stops the Pomodoro timer.

## Setup & Configuration

1.  Install dependencies: `npm install`
2.  Set up environment variables by copying `env-template` to `.env` and filling in the required values:
    -   `GITHUB_TOKEN`: For GitHub API access.
    -   `GEMINI_API_KEY`: For the AI model.
    -   Google Calendar API credentials (if using the calendar feature).
