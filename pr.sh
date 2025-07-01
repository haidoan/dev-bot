#!/bin/bash

# Default values
DEFAULT_TARGET="develop"
DEFAULT_TITLE="Pull Request"
DEFAULT_BODY="Please review this PR"
DEFAULT_REVIEWERS=""

# Help function
show_help() {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  -s, --source     Source branch (optional, defaults to current branch)"
    echo "  -t, --target     Target branch (default: develop)"
    echo "  --title          PR title (default: auto-generated from branch name)"
    echo "  --body           PR body (default: Please review this PR)"
    echo "  -r, --reviewers  Comma-separated list of reviewers (no spaces)"
    echo "  -l, --list       List available reviewers"
    echo "  -h, --help       Show this help message"
    exit 1
}

# List available reviewers
list_reviewers() {
    echo "Available reviewers:"
    gh api repos/:owner/:repo/collaborators --jq '.[].login'
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        -s|--source)
            SOURCE_BRANCH="$2"
            shift 2
            ;;
        -t|--target)
            TARGET_BRANCH="$2"
            shift 2
            ;;
        --title)
            PR_TITLE="$2"
            shift 2
            ;;
        --body)
            PR_BODY="$2"
            shift 2
            ;;
        -r|--reviewers)
            REVIEWERS="$2"
            shift 2
            ;;
        -l|--list)
            list_reviewers
            ;;
        -h|--help)
            show_help
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            ;;
    esac
done

# Get current branch if source not specified
if [ -z "$SOURCE_BRANCH" ]; then
    SOURCE_BRANCH=$(git branch --show-current)
    if [ -z "$SOURCE_BRANCH" ]; then
        echo "Error: Could not determine current branch. Please specify with -s option."
        exit 1
    fi
    echo "Using current branch: $SOURCE_BRANCH"
fi

# Set defaults if not provided
TARGET_BRANCH=${TARGET_BRANCH:-$DEFAULT_TARGET}

# Generate PR title from branch name if not provided
if [ -z "$PR_TITLE" ]; then
    # Extract ticket number (assumes format like features/tk-5191-refactor-ws-handle-lc-proxy)
    if [[ $SOURCE_BRANCH =~ [a-zA-Z]+-[0-9]+ ]]; then
        TICKET="${BASH_REMATCH[0]}"
        TICKET_UPPER=$(echo "$TICKET" | tr '[:lower:]' '[:upper:]')
        
        # Extract description part (everything after the ticket number)
        DESCRIPTION=$(echo "$SOURCE_BRANCH" | sed -E "s/.*$TICKET-//")
        
        # Format description: replace hyphens with spaces and capitalize first letter
        DESCRIPTION=$(echo "$DESCRIPTION" | tr '-' ' ')
        
        # Set PR title
        PR_TITLE="[$TICKET_UPPER] $DESCRIPTION"
    else
        PR_TITLE="$DEFAULT_TITLE"
    fi
fi

PR_BODY=${PR_BODY:-$DEFAULT_BODY}
REVIEWERS=${REVIEWERS:-$DEFAULT_REVIEWERS}

# Confirm details
echo "Creating PR with the following details:"
echo "  Source branch: $SOURCE_BRANCH"
echo "  Target branch: $TARGET_BRANCH"
echo "  Title: $PR_TITLE"
echo "  Body: $PR_BODY"
if [ -n "$REVIEWERS" ]; then
    echo "  Reviewers: $REVIEWERS"
fi

read -p "Continue? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled"
    exit 1
fi

# Push the branch
echo "Pushing branch $SOURCE_BRANCH..."
git push -u origin "$SOURCE_BRANCH"

# Create PR command
PR_CMD="gh pr create --base \"$TARGET_BRANCH\" --head \"$SOURCE_BRANCH\" --title \"$PR_TITLE\" --body \"$PR_BODY\""

# Add reviewers if specified
if [ -n "$REVIEWERS" ]; then
    PR_CMD="$PR_CMD --reviewer \"$REVIEWERS\""
fi

# Execute the command
echo "Creating PR..."
eval "$PR_CMD"

echo "PR created successfully!" 