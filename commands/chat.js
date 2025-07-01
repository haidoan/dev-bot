import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import ora from 'ora';
import chalk from 'chalk';
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


async function chat(prompt) {
    const spinner = ora('Thinking...').start();
    try {
        const chat = model.startChat({ tools: [{ functionDeclarations: toolDeclarations }] });

        const result = await chat.sendMessage(prompt);
        const call = result.response.functionCalls()?.[0];

        if (call) {
            const { name, args } = call;
            spinner.text = `Using tool: ${name}...`;
            const result = await tools[name](args);
            spinner.succeed(`Tool ${name} finished.`);
            console.log(chalk.green(JSON.stringify(result, null, 2)));
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
    .description('Chat with the Gemini API (with function calling)')
    .action(chat);
}
