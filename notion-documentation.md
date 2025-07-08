# 🤖 Gemini CLI Bot - AI-Powered Development Assistant

> **A sophisticated CLI bot that bridges traditional command-line tools with AI-powered interactive assistance using the Model Context Protocol (MCP)**

---

## 🎯 Project Overview

The Gemini CLI Bot is a next-generation development assistant that combines the speed of CLI commands with the intelligence of AI. Built on the **Model Context Protocol (MCP)**, it provides developers with both instant command execution and contextual AI assistance for complex workflows.

### 🏗️ Architecture

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   CLI Commands      │    │   MCP Server        │    │   AI Interactive    │
│   (Script Mode)     │◄──►│   (Tool Bridge)     │◄──►│   (Chat Mode)       │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
         │                           │                           │
         ▼                           ▼                           ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   GitHub API        │    │   Google Calendar   │    │   Currency API      │
│   Desktop Notify    │    │   JWT Processing    │    │   File System       │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

**Key Components:**
- **CLI Layer**: Direct command execution for speed
- **MCP Bridge**: Standardized tool interface for AI integration
- **AI Interactive**: Context-aware assistance with natural language processing

---

## 🚀 Core Features

### 📋 Script Mode (CLI Commands)
*Direct command execution for maximum efficiency*

#### Pull Request Management
```bash
# Create PR with intelligent branch name parsing
bot pr create --source feature/auth --target develop --reviewers alice,bob

# Interactive PR approval with smart filtering
bot pr approve --comment "LGTM! Great work on the auth flow"

# List your assigned PRs
bot pr list-mine
```

#### Calendar Integration
```bash
# Quick calendar overview
bot calendar today
bot calendar week
```

#### Developer Utilities
```bash
# JWT decoding for debugging
bot jwt eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Currency conversion for international teams
bot currency 1000 --from USD --to VND

# Desktop notifications for workflow automation
bot notify "Build completed" --title "CI/CD"
```

### 🧠 AI Interactive Mode
*Powered by MCP for contextual, intelligent assistance*

#### What Makes It Special

**1. Model Context Protocol Integration**
- **Standardized Tool Interface**: All CLI commands become AI-accessible tools
- **Context Preservation**: AI maintains conversation context across tool calls
- **Intelligent Tool Selection**: AI chooses appropriate tools based on natural language requests

**2. Advanced Code Understanding**
```
User: "Review the changes in PR #123 and focus on security implications"
AI: → Fetches PR diff → Analyzes code → Provides security-focused review
```

**3. Workflow Intelligence**
```
User: "What did I work on yesterday and create a summary PR"
AI: → Checks git history → Summarizes changes → Creates PR with intelligent title/body
```

#### 🔧 MCP-Enabled Capabilities

| **Traditional CLI** | **AI Interactive with MCP** |
|---------------------|------------------------------|
| `bot pr create --title "Fix"` | *"Create a PR for my auth changes with a descriptive title"* |
| `bot calendar today` | *"Do I have any conflicts with the 3pm meeting?"* |
| `bot jwt decode xyz` | *"This JWT isn't working, help me debug it"* |

**The AI can:**
- **Chain multiple tools** seamlessly
- **Provide context-aware suggestions**
- **Handle complex, multi-step workflows**
- **Learn from your preferences** over time

---

## 🛠️ Technical Implementation

### Model Context Protocol (MCP)
The bot leverages MCP to create a standardized interface between AI models and external tools:

```javascript
// MCP Tool Definition Example
{
  name: "create_github_pr",
  description: "Create a GitHub pull request",
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string" },
      body: { type: "string" },
      reviewers: { type: "string" }
    }
  }
}
```

**Benefits of MCP Architecture:**
- **Modularity**: Easy to add new tools
- **Standardization**: Consistent interface across all tools
- **Reliability**: Type-safe tool interactions
- **Extensibility**: AI can discover and use new tools dynamically

### AI Integration Points
1. **Tool Discovery**: AI automatically discovers available MCP tools
2. **Context Management**: Maintains conversation state across tool calls
3. **Error Handling**: Intelligent retry and fallback mechanisms
4. **Response Formatting**: Contextual, human-readable responses

---

## 📈 Use Cases & Workflows

### 🎯 Daily Development Workflow
```
Morning Standup Preparation:
"What did I work on yesterday and what PRs need my review?"

AI Response:
→ Analyzes git commits since yesterday
→ Lists pending PR reviews
→ Provides summary for standup
```

### 🔄 Complex PR Workflow
```
End-of-Sprint PR Creation:
"Create a PR for all my feature work this week with proper categorization"

AI Response:
→ Reviews git history for the week
→ Categorizes changes by feature/bugfix
→ Generates comprehensive PR description
→ Suggests appropriate reviewers
→ Creates the PR
```

### 📊 Project Management Integration
```
Sprint Planning:
"Check my calendar conflicts with the upcoming sprint meetings"

AI Response:
→ Fetches calendar events
→ Identifies potential conflicts
→ Suggests optimal meeting times
→ Can send notifications for reminders
```

---

## 🎨 Interactive Demo Examples

### Example 1: Intelligent PR Review
```
👤 User: "Review PR #456 and tell me if there are any security concerns"

🤖 AI: Let me fetch and analyze that PR for you...

[Fetches PR #456 diff]

**Security Review Summary:**
🔴 **Critical**: SQL query on line 23 appears vulnerable to injection
🟡 **Warning**: User input not sanitized before logging (line 67)
✅ **Good**: Proper authentication checks implemented

**Recommendations:**
1. Use parameterized queries for database operations
2. Implement input sanitization for logging
3. Consider adding rate limiting for the new endpoint
```

### Example 2: Contextual Development Assistance
```
👤 User: "I'm working on user authentication. Create a PR and make sure the team knows it's ready for security review"

🤖 AI: I'll help you create a comprehensive PR for your authentication work.

[Analyzes recent commits]
[Generates PR title: "[AUTH] Implement JWT-based user authentication with role-based access control"]
[Creates detailed PR body with security checklist]
[Adds security team as reviewers]
[Sends notification to team]

**PR Created**: #789 - Ready for security review ✅
```

---

## 🔧 Setup & Configuration

### Prerequisites
- Node.js 18+
- GitHub CLI (`gh`) authenticated
- Google Calendar API access
- Environment variables configured

### Installation
```bash
# Install dependencies
npm install

# Configure environment
cp env-template .env
# Edit .env with your API keys

# Make CLI globally available
npm link
```

### MCP Configuration
The bot uses `cursor-mcp-config.json` for MCP server configuration:
```json
{
  "mcpServers": {
    "bot": {
      "command": "node",
      "args": ["mcp-server.js"]
    }
  }
}
```

---

## 🌟 Why This Approach Works

### **Traditional CLI Tools**
- ✅ Fast execution
- ✅ Scriptable
- ❌ Limited context awareness
- ❌ Requires exact syntax

### **AI-Only Assistants**
- ✅ Natural language interface
- ✅ Context aware
- ❌ Slow for simple tasks
- ❌ Limited tool integration

### **Our MCP-Powered Solution**
- ✅ **Best of both worlds**
- ✅ **Fast CLI + Intelligent AI**
- ✅ **Context-aware tool selection**
- ✅ **Extensible architecture**
- ✅ **Consistent interface**

---

## 🔮 Future Enhancements

### Planned Features
- **Multi-repository support** with workspace awareness
- **Custom workflow automation** with AI-generated scripts
- **Integration with more development tools** (Jira, Slack, etc.)
- **Learning from user patterns** for proactive suggestions
- **Team collaboration features** with shared context

### Technical Roadmap
- **Enhanced MCP tool discovery** with dynamic loading
- **Advanced context management** with persistent memory
- **Plugin architecture** for community contributions
- **Performance optimizations** for large codebases

---

## 📞 Getting Started

Ready to supercharge your development workflow?

1. **Try the CLI commands** for immediate productivity gains
2. **Explore interactive mode** for complex workflows
3. **Customize tools** to match your team's needs
4. **Share feedback** to help us improve

**Start with**: `bot interactive` and ask *"What can you help me with today?"*

---

*Built with ❤️ for developers who want the speed of CLI with the intelligence of AI* 