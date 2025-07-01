import { Command } from 'commander';
import notifier from 'node-notifier';
import chalk from 'chalk';

function sendNotification(message, options) {
    notifier.notify(
        {
            title: options.title || 'Bot Notification',
            message: message,
            sound: true,
            wait: false
        },
        function (err, response) {
            if (err) {
                console.error(chalk.red('Notification error:'), err);
                return;
            }
        }
    );
    console.log(chalk.green('Notification sent!'));
}

export default function (program) {
  program
    .command('notify <message>')
    .description('Send a desktop notification')
    .option('-t, --title <title>', 'Notification title')
    .action(sendNotification);
}
