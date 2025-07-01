import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import ora from 'ora';
import chalk from 'chalk';
import { tools, toolDefinitions } from '../lib/tools.js';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash-latest',
    systemInstruction: `You are a helpful AI assistant for a software developer.
    You have access to various development tools including:
    - GitHub PR management (create, approve, list)
    - Currency conversion using Vietnamese bank rates  
    - JWT token decoding
    - Git repository analysis
    - Desktop notifications
    - Code change summaries
    
    When a user asks for something, determine if any of your tools can help.
    Use natural language responses and be conversational.
    Always explain what you're doing when using tools.
    
    Examples of what you can do:
    - "approve this pr" or "approve pr 123"
    - "what's the USD to VND rate today?" or "convert 100 USD to VND"
    - "create pr to develop with reviewers john,jane"
    - "decode this jwt token: eyJ..."
    - "show me what changed yesterday"
    - "send me a notification to check the meeting"
    - "list open prs"`,
});

async function chat(prompt) {
    const spinner = ora('Thinking...').start();
    try {
        const chat = model.startChat({ 
            tools: [{ functionDeclarations: toolDefinitions }]
        });

        const result = await chat.sendMessage(prompt);
        const call = result.response.functionCalls()?.[0];

        if (call) {
            const { name, args } = call;
            spinner.text = `Using tool: ${name}...`;
            
            if (!tools[name]) {
                spinner.fail('Error');
                console.error(chalk.red(`Tool ${name} not found`));
                return;
            }
            
            const toolResult = await tools[name](args);
            spinner.succeed(`Tool ${name} completed`);
            
            if (toolResult.error) {
                console.log(chalk.red(`❌ ${toolResult.error}`));
            } else {
                console.log(chalk.green(JSON.stringify(toolResult, null, 2)));
            }
        } else {
            spinner.succeed('Done!');
            console.log(chalk.green(result.response.text()));
        }

    } catch (error) {
        spinner.fail('Error');
        console.error(chalk.red(error.message));
    }
}

export default function (program) {
  program
    .command('chat <prompt>')
    .description('Chat with AI assistant (understands all your bot tools)')
    .action(chat);
}
