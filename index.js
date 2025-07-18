#!/usr/bin/env node

import { Command } from 'commander';
import { commandRegistry } from './lib/commands.js';
import interactiveChat from './commands/interactive.js';
import { createPr, approvePr, listMyPrs, listMyRepos } from './commands/pr.js';
import { listWeeklyMeetings, listTodayMeetings, addCalendarEvent } from './commands/calendar.js';
import { startPomodoro, stopPomodoro } from './commands/pomodoro.js';

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

  const prCommand = program.command('pr')
    .description('Manage GitHub pull requests');

  prCommand
    .command('create')
    .description('Create a new pull request')
    .option('-s, --source <branch>', 'Source branch (defaults to current branch)')
    .option('-t, --target <branch>', 'Target branch (defaults to develop)')
    .option('--title <title>', 'Pull request title')
    .option('--body <body>', 'Pull request body')
    .option('-r, --reviewers <users>', 'Comma-separated list of reviewers')
    .option('-l, --list', 'List available reviewers')
    .action(createPr);

  prCommand
    .command('approve [pr]')
    .description('Approve a pull request')
    .option('-c, --comment <comment>', 'Review comment')
    .option('-a, --all', 'Show all open PRs, not just ones you are reviewing')
    .action(approvePr);

  prCommand
    .command('list-mine')
    .description('List all pull requests assigned to you')
    .action(listMyPrs);

  prCommand
    .command('list-repo')
    .description('List all pull requests assigned to you')
    .action(listMyRepos);

  const calendarCommand = program.command('calendar')
    .description('Manage Google Calendar events');

  calendarCommand
    .command('week')
    .description('List all meetings for this week')
    .action(listWeeklyMeetings);

  calendarCommand
    .command('today')
    .description('List all meetings for today')
    .action(listTodayMeetings);

  calendarCommand
    .command('add')
    .description('Add a new event to the calendar')
    .requiredOption('-s, --summary <summary>', 'Event summary or title')
    .requiredOption('--startTime <startTime>', 'Event start time (e.g., "2025-07-04T10:00:00-07:00")')
    .requiredOption('--endTime <endTime>', 'Event end time (e.g., "2025-07-04T11:00:00-07:00")')
    .option('-d, --description <description>', 'Event description')
    .option('-l, --location <location>', 'Event location')
    .option('-a, --attendees <attendees>', 'Comma-separated list of attendee emails')
    .action((options) => {
      const { summary, startTime, endTime, description, location, attendees } = options;
      addCalendarEvent(summary, startTime, endTime, description, location, attendees);
    });

  const pomodoroCommand = program.command('pomodoro')
    .description('Start a Pomodoro timer (25min work + 5min break)');

  pomodoroCommand
    .command('start')
    .description('Start the Pomodoro timer')
    .option('--run-timer', 'Internal flag to run the timer process', { hidden: true })
    .action((options) => startPomodoro(options));

  pomodoroCommand
    .command('stop')
    .description('Stop the running Pomodoro timer')
    .action(stopPomodoro);

  program.command('interactive')
    .description('Start an interactive chat session with the bot')
    .action(interactiveChat);

  program.parse(process.argv);
}

main();
