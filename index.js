#!/usr/bin/env node

import { Command } from 'commander';
import { commandRegistry } from './lib/commands.js';

const program = new Command();

program
  .name('bot')
  .description('A CLI helper bot powered by AI')
  .version('2.0.0');

function buildCommands() {
    const commandMap = new Map();

    commandRegistry.forEach(cmdDef => {
        const [main, sub] = cmdDef.name.split(' ');
        
        let parentCommand = commandMap.get(main);
        if (!parentCommand) {
            parentCommand = program.command(main).description(`${main} commands`);
            commandMap.set(main, parentCommand);
        }

        const command = sub ? parentCommand.command(sub) : parentCommand;
        
        command.description(cmdDef.description);

        if (cmdDef.args) {
            cmdDef.args.forEach(arg => command.argument(arg.name, arg.description));
        }

        if (cmdDef.options) {
            cmdDef.options.forEach(opt => command.option(opt.flag, opt.description));
        }

        command.action(cmdDef.action);
    });
}


async function main() {
  buildCommands();
  // I will add back the dynamic loading for other commands later
  program.parse(process.argv);
}

main();
