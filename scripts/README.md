# PR Script

A bash script to streamline GitHub pull request creation with intelligent defaults and branch name parsing.

## Prerequisites

- [GitHub CLI](https://cli.github.com/) installed and authenticated
- Git repository with GitHub remote

## Global Installation

### Option 1: Symlink (Recommended)
```bash
# Make the script executable
chmod +x /path/to/your/scripts/pr.sh

# Create symlink in a directory that's in your PATH
ln -s /path/to/your/scripts/pr.sh /usr/local/bin/pr

# Now you can use 'pr' from anywhere
pr --help
```

### Option 2: Copy to PATH
```bash
# Make executable and copy to PATH
chmod +x /path/to/your/scripts/pr.sh
cp /path/to/your/scripts/pr.sh /usr/local/bin/pr
```

### Option 3: Add to PATH
```bash
# Add scripts directory to your PATH in ~/.bashrc or ~/.zshrc
export PATH="$PATH:/path/to/your/scripts"

# Make executable
chmod +x /path/to/your/scripts/pr.sh

# Use with full name
pr.sh --help
```

## Usage

### Basic Usage
```bash
# Create PR from current branch to develop (default)
pr

# Create PR with specific target branch
pr -t main

# Create PR with custom title and body
pr --title "Fix user authentication" --body "This PR fixes the login issue"
```

### Advanced Usage
```bash
# Create PR with reviewers
pr -r "user1,user2,user3"

# Create PR from specific source branch
pr -s feature-branch -t main

# Full example
pr -s feature/user-auth -t develop --title "Add user authentication" --body "Implements JWT-based auth" -r "john,jane"
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-s, --source` | Source branch | Current branch |
| `-t, --target` | Target branch | develop |
| `--title` | PR title | Auto-generated from branch name |
| `--body` | PR body | "Please review this PR" |
| `-r, --reviewers` | Comma-separated reviewers | None |
| `-l, --list` | List available reviewers | - |
| `-h, --help` | Show help | - |

### Smart Title Generation

The script automatically generates PR titles from branch names following this pattern:
- Branch: `features/tk-5191-refactor-ws-handle-lc-proxy`
- Generated title: `[TK-5191] refactor ws handle lc proxy`

### List Available Reviewers
```bash
pr -l
# or
pr --list
```

## Examples

### Simple PR
```bash
pr
```
Creates PR from current branch to develop with auto-generated title.

### PR with Custom Target
```bash
pr -t main
```

### PR with Everything Custom
```bash
pr -s feature/auth -t main --title "Add OAuth integration" --body "Implements Google OAuth login" -r "alice,bob"
```

### Interactive Confirmation
The script will show you a summary and ask for confirmation before creating the PR:
```
Creating PR with the following details:
  Source branch: feature/auth
  Target branch: develop
  Title: [TK-123] add user authentication
  Body: Please review this PR
  Reviewers: alice,bob
Continue? (y/n):
```

## Troubleshooting

### GitHub CLI Not Authenticated
```bash
gh auth login
```

### Permission Denied
```bash
chmod +x /path/to/pr.sh
```

### Script Not Found
Ensure the script is in your PATH and executable, or use the full path to the script. 