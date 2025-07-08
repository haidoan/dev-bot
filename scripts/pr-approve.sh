#!/bin/bash

# Help function
show_help() {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  -p, --pr         PR number to approve (if you already know it)"
    echo "  -r, --repo       Repository in format 'owner/repo' (optional, uses current repo if not specified)"
    echo "  -c, --comment    Review comment (optional)"
    echo "  -a, --all        Show all PRs, not just ones you're reviewing (optional)"
    echo "  -h, --help       Show this help message"
    exit 1
}

# Parse arguments
PR_NUMBER=""
REPO=""
COMMENT=""
SHOW_ALL=false

while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        -p|--pr)
            PR_NUMBER="$2"
            shift 2
            ;;
        -r|--repo)
            REPO="$2"
            shift 2
            ;;
        -c|--comment)
            COMMENT="$2"
            shift 2
            ;;
        -a|--all)
            SHOW_ALL=true
            shift
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

# Set up repo flag if specified
REPO_FLAG=""
if [ -n "$REPO" ]; then
    REPO_FLAG="-R $REPO"
    echo "Using repository: $REPO"
else
    echo "Using current repository"
fi

# If no PR number provided, list PRs to review
if [ -z "$PR_NUMBER" ]; then
    # Get username for the search
    USERNAME=$(gh api user --jq '.login')
    
    echo "Fetching PRs for review..."
    
    if [ "$SHOW_ALL" = true ]; then
        echo "Showing all open PRs:"
        PR_LIST=$(gh pr list $REPO_FLAG --json number,title,url,reviewRequests --limit 100)
    else
        echo "Showing PRs where you're a reviewer:"
        PR_LIST=$(gh pr list $REPO_FLAG --json number,title,url,reviewRequests --limit 100 | jq "[.[] | select(.reviewRequests[].login == \"$USERNAME\")]")
    fi
    
    # Count PRs
    PR_COUNT=$(echo $PR_LIST | jq '. | length')
    
    if [ "$PR_COUNT" -eq 0 ]; then
        if [ "$SHOW_ALL" = true ]; then
            echo "No open PRs found."
        else
            echo "No PRs found where you're assigned as reviewer."
            echo "Try with -a flag to see all PRs."
        fi
        exit 0
    fi
    
    # Display PRs with numbers and URLs
    echo $PR_LIST | jq -r '.[] | "#\(.number): \(.title) \n  URL: \(.url)"'
    echo ""
    
    # Let user select a PR
    read -p "Enter PR number to approve (or q to quit): " PR_INPUT
    if [[ "$PR_INPUT" == "q" || "$PR_INPUT" == "Q" ]]; then
        echo "Operation cancelled"
        exit 0
    fi
    
    # Strip # if present
    PR_INPUT=$(echo $PR_INPUT | sed 's/^#//')
    
    if [[ ! "$PR_INPUT" =~ ^[0-9]+$ ]]; then
        echo "Invalid PR number"
        exit 1
    fi
    PR_NUMBER=$PR_INPUT
fi

# Show PR details
echo "Fetching details for PR #$PR_NUMBER..."
gh pr view $REPO_FLAG $PR_NUMBER

# Confirm approval
read -p "Approve this PR? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled"
    exit 1
fi

# Build review command
REVIEW_CMD="gh pr review $REPO_FLAG $PR_NUMBER --approve"
if [ -n "$COMMENT" ]; then
    REVIEW_CMD="$REVIEW_CMD --body \"$COMMENT\""
fi

# Execute the command
echo "Approving PR #$PR_NUMBER..."
eval "$REVIEW_CMD"

echo "PR approved successfully!" 