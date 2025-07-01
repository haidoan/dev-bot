#!/usr/bin/env node

import { Command } from 'commander';
import { readdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

program
  .name('bot')
  .description('A CLI helper bot powered by AI')
  .version('2.0.0');

async function loadCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = await readdir(commandsPath);

  for (const file of commandFiles) {
    if (file.endsWith('.js')) {
      const commandModule = await import(path.join(commandsPath, file));
      if (commandModule.default && typeof commandModule.default === 'function') {
        commandModule.default(program);
      }
    }
  }
}

async function main() {
  await loadCommands();
  program.parse(process.argv);
}

main();