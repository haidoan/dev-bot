import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import ora from 'ora';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { tools, toolDeclarations } from '../lib/tools.js';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash-latest',
    systemInstruction: `You are a helpful AI assistant for a software developer.
    You have access to a set of tools to help the user with their tasks.
    When a user asks for something, first determine if a tool can be used.
    If a tool is appropriate, use it. Otherwise, respond to the user directly.
    If you use a tool, explain what you did and the result.`,
});

async function interactiveChat() {
    console.log(chalk.blue('Starting interactive chat session...'));
    console.log(chalk.yellow('Type "exit" or "quit" to end the session.'));

    const chat = model.startChat({
        tools: [{ functionDeclarations: toolDeclarations }],
        history: [],
    });

    while (true) {
        const { prompt } = await inquirer.prompt([
            {
                type: 'input',
                name: 'prompt',
                message: chalk.green('You:'),
            },
        ]);

        if (prompt.toLowerCase() === 'exit' || prompt.toLowerCase() === 'quit') {
            console.log(chalk.blue('Ending chat session.'));
            break;
        }

        const spinner = ora('Thinking...').start();
        try {
            const result = await chat.sendMessage(prompt);
            const call = result.response.functionCalls()?.[0];

            if (call) {
                const { name, args } = call;
                spinner.text = `Using tool: ${name}...`;
                const toolResult = await tools[name](args);
                spinner.succeed(`Tool ${name} finished.`);

                if (name === 'review_pr' && toolResult.summary) {
                    const formattedSummary = toolResult.summary.replace(/\*\*(.*?)\*\*/g, chalk.bold.yellow('$1'));
                    console.log(chalk.yellow('Bot:'), chalk.cyan(formattedSummary));
                } else {
                    console.log(chalk.yellow('Bot:'), chalk.cyan(JSON.stringify(toolResult, null, 2)));
                }
            } else {
                spinner.succeed('Done!');
                console.log(chalk.yellow('Bot:'), chalk.cyan(result.response.text()));
            }
        } catch (error) {
            spinner.fail('Error');
            console.error(chalk.red(error.message));
        }
    }
}

export default function (program) {
    program
        .command('interactive')
        .description('Start an interactive chat session with the bot')
        .action(interactiveChat);
}
