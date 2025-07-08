# Gemini CLI Bot

This is a CLI helper bot powered by AI to assist with various software development tasks.

## Features

### Script Mode (CLI Commands)

You can run these directly from your terminal.

*   **Manage Pull Requests:**
    *   `bot pr create [options]`: Creates a new GitHub pull request with interactive prompts for confirmation.
        *   `--source`, `--target`, `--title`, `--body`, `--reviewers`
        *   `--list`: Lists available reviewers for the repository.
    *   `bot pr approve [pr_number] [options]`: Approves a pull request, with an interactive selector if no PR number is provided.
        *   `--comment`: Adds an approval comment.
        *   `--all`: Shows all open PRs, not just those assigned to you.
    *   `bot pr list-mine`: Lists all pull requests assigned to you.
*   **Manage Calendar:**
    *   `bot calendar today`: Lists all Google Calendar events for today.
    *   `bot calendar week`: Lists all Google Calendar events for the current week.
*   **Decode JWT:**
    *   `bot jwt <token>`: Decodes a JSON Web Token and prints the payload.
*   **Convert Currency:**
    *   `bot currency <amount> [options]`: Converts a currency amount.
        *   `--from`, `--to`
*   **Send Notification:**
    *   `bot notify <message> [options]`: Sends a desktop notification.
        *   `--title`
*   **Interactive Mode:**
    *   `bot interactive`: Starts the AI-powered chat session.

### Interactive Mode (AI Chat Tools)

When you're in the `bot interactive` session, the AI has access to the following tools and can use them to answer your requests:

*   **Summarize Code Changes:** Can look at the git history (e.g., "since yesterday") and summarize the file changes.
*   **Create a Pull Request:** Creates a PR based on your instructions (e.g., "Create a PR to develop titled 'My Feature'").
*   **Review a Pull Request:** Fetches the code changes from a specific PR number and provides a detailed review, focusing on purpose, potential bugs, and code quality.
*   **Approve a Pull Request:** Approves a specified PR number, with an optional comment.
*   **Get Calendar Events:**
    *   Fetches today's or this week's events from your Google Calendar.
*   **Decode a JWT:** Decodes a JWT string that you provide in the chat.
*   **Convert Currency:** Fetches the latest exchange rates to convert between currencies (e.g., "what's the rate for USD to VND?").
*   **Send a Notification:** Sends a desktop notification with a title and message that you specify.

## Troubleshooting

### Google Calendar Authorization

If you encounter an `insufficientPermissions` error or other issues with Google Calendar, you may need to re-authorize the application. This is typically required if new calendar-related features are added that require broader permissions (e.g., writing events when it was previously read-only).

To re-authorize:
1.  Delete the token file stored at the root of this project: `.google-token.json`
2.  Run any calendar command again (e.g., `bot calendar today`).
3.  Your browser will open, prompting you to log in and approve the new permissions.


## this is testing ##
