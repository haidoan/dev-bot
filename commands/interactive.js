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
    For any request that can be fulfilled by a tool, you MUST use the tool. Do not attempt to answer directly if a tool is available.
    If the user asks to start or stop a Pomodoro timer, you MUST use the 'start_pomodoro' or 'stop_pomodoro' tools respectively.
    If the user asks for a currency exchange rate (e.g., "USD to VND rate"), you MUST use the 'convert_currency' tool. If no amount is specified, assume an amount of 1.
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
            const functionCalls = result.response.functionCalls();

            if (functionCalls && functionCalls.length > 0) {
                for (const call of functionCalls) {
                    const { name, args } = call;
                    console.log(chalk.yellow(`
Bot: I'm planning to use the tool: ${chalk.bold(name)} with arguments:`));
                    console.log(chalk.cyan(JSON.stringify(args, null, 2)));

                    const { confirmTool } = await inquirer.prompt([
                        {
                            type: 'confirm',
                            name: 'confirmTool',
                            message: chalk.green('Do you want to proceed with this tool execution?'),
                            default: true,
                        },
                    ]);

                    if (confirmTool) {
                        spinner.text = `Using tool: ${name}...`;
                        const toolResult = await tools[name](args);
                        spinner.succeed(`Tool ${name} finished.`);

                        const toolResponse = {
                            functionResponse: {
                                name,
                                response: toolResult,
                            },
                        };

                        const finalResult = await chat.sendMessage(JSON.stringify(toolResponse));
                        console.log(chalk.yellow('Bot:'), chalk.cyan(finalResult.response.text()));

                    } else {
                        spinner.fail(`Tool ${name} execution skipped by user.`);
                        console.log(chalk.yellow('Bot:'), chalk.red('Tool execution cancelled.'));
                    }
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

export default interactiveChat;
