# AI Bot - Enhanced Interactive Assistant

A powerful AI-powered automation bot that understands natural language and executes development tasks.

## Features

### 🤖 AI Interactive Mode
- **Natural Language Processing**: Ask in plain English
- **Tool Understanding**: Automatically selects and executes the right tools
- **Continuous Chat**: Interactive session with memory

### 🛠️ Available Tools
- **GitHub PR Management**: Create, approve, and list pull requests
- **Currency Conversion**: Real-time rates from Vietnamese banks
- **JWT Decoding**: Decode and analyze JWT tokens
- **Code Analysis**: Summarize git changes and repository status
- **Desktop Notifications**: Send system notifications
- **Git Operations**: Repository analysis and branch management

## Usage

### Interactive Mode (Recommended)
```bash
bot interactive
# or
bot i
```

Start a continuous chat session with the AI assistant. Examples:
- "approve this pr"
- "what's the USD to VND rate today?"
- "create pr to develop with reviewers alice,bob"
- "show me what changed yesterday"
- "send me a notification about the meeting"
- "list open prs"

### Single Command Mode
```bash
bot chat "approve the latest PR"
bot chat "convert 100 USD to VND"
bot chat "create pr to main branch"
```

### Direct Tool Usage (Classic Mode)
```bash
bot pr create -t develop -r alice,bob --title "Feature XYZ"
bot currency 100 -f USD -t VND
bot jwt eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
bot notify "Don't forget the meeting!"
```

## Examples

### Natural Language Examples
- **"approve this pr"** → Approves the most recent open PR
- **"approve pr 123"** → Approves specific PR #123
- **"what's 50 USD in VND?"** → Converts currency using bank rates
- **"create pr to develop"** → Creates PR with auto-generated title
- **"show me changes from last week"** → Git diff summary
- **"decode this token: eyJ..."** → JWT analysis
- **"list all open prs"** → Shows all open pull requests
- **"notify me about deployment"** → Desktop notification

### AI Understanding
The bot understands context and variations:
- "approve the pr" / "approve this pull request" / "approve pr"
- "usd to vnd rate" / "dollar to dong" / "currency rate"
- "create pull request" / "make pr" / "new pr"

## Setup

1. Install dependencies:
```bash
yarn install
```

2. Set up environment variables:
```bash
cp env-template .env
# Edit .env with your API keys
```

3. Make executable:
```bash
chmod +x index.js
npm link  # or yarn link
```

## Environment Variables
- `GEMINI_API_KEY`: Google Gemini API key for AI functionality
- `GITHUB_TOKEN`: GitHub personal access token for PR operations

## Tips
- Use interactive mode for better conversation flow
- The AI remembers context within a session
- Type "exit" or "quit" to end interactive mode
- All tools work both via AI and direct commands