import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import ora from 'ora';
import chalk from 'chalk';
import inquirer from 'inquirer';
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
    Keep your responses concise but informative.
    
    Available commands you understand:
    - "approve this pr" or "approve pr 123"
    - "what's the USD to VND rate today?" or "convert 100 USD to VND"
    - "create pr to develop with reviewers john,jane"
    - "decode this jwt token: eyJ..."
    - "show me what changed yesterday"
    - "send me a notification to check the meeting"
    - "list open prs"
    - "exit" or "quit" to end the session`,
});

async function processMessage(chat, message) {
    const spinner = ora('Processing...').start();
    try {
        const result = await chat.sendMessage(message);
        const call = result.response.functionCalls()?.[0];

        if (call) {
            const { name, args } = call;
            spinner.text = `Using ${name} tool...`;
            
            if (!tools[name]) {
                spinner.fail('Error');
                console.error(chalk.red(`❌ Tool ${name} not found`));
                return;
            }
            
            const toolResult = await tools[name](args);
            spinner.succeed(`✅ ${name} completed`);
            
            if (toolResult.error) {
                console.log(chalk.red(`❌ ${toolResult.error}`));
            } else {
                console.log(chalk.green(JSON.stringify(toolResult, null, 2)));
            }
        } else {
            spinner.succeed('✅ Done');
            console.log(chalk.cyan(result.response.text()));
        }

    } catch (error) {
        spinner.fail('❌ Error');
        console.error(chalk.red(error.message));
    }
}

async function interactive() {
    console.log(chalk.blue('🤖 Bot Interactive Mode'));
    console.log(chalk.gray('Type "exit" or "quit" to end the session'));
    console.log(chalk.gray('Examples: "approve this pr", "what\'s USD to VND rate?", "create pr to develop"'));
    console.log(chalk.gray('─'.repeat(50)));

    const chat = model.startChat({ 
        tools: [{ functionDeclarations: toolDefinitions }]
    });

    while (true) {
        try {
            const { message } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'message',
                    message: '💬',
                    prefix: ''
                }
            ]);

            if (message.toLowerCase().trim() === 'exit' || message.toLowerCase().trim() === 'quit') {
                console.log(chalk.blue('👋 Goodbye!'));
                break;
            }

            if (message.trim() === '') {
                continue;
            }

            await processMessage(chat, message);
            console.log(''); // Add spacing between conversations
        } catch (error) {
            if (error.isTtyError) {
                console.log(chalk.red('Interactive mode requires a TTY environment'));
                break;
            } else {
                console.error(chalk.red('Error in interactive mode:', error.message));
            }
        }
    }
}

export default function (program) {
    program
        .command('interactive')
        .alias('i')
        .description('Start interactive chat mode with the AI assistant')
        .action(interactive);
}