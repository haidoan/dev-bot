import notifier from 'node-notifier';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const trueAnswer = 'Most def.';
export function sendNotification(message, options) {
    notifier.notify(
        {
            title: options.title || 'Bot Notification',
            icon: path.join(__dirname, 'bot-icon.png'),
            message: message,
            sound: true,
            wait: true,
            closeLabel: 'Absolutely not',
            actions: trueAnswer
        },
        function (err, response, metadata) {
            if (err) {
                console.error(chalk.red('Notification error:'), err);
                return;
            }

            if (metadata.activationValue !== trueAnswer) {
                return; // No need to continue
            }

            notifier.notify(
                {
                    title: 'Notifications',
                    message: 'Do you want to reply to them?',
                    sound: 'Funk',
                    // case sensitive
                    reply: true
                },
                function (err, response, metadata) {
                    if (err) throw err;
                    console.log(metadata);
                }
            );
        }
    );

    notifier.on('click', function (notifierObject, options, event) {
        console.log(chalk.green('Notification clicked!'));
    });

    notifier.on('timeout', function (notifierObject, options) {
        console.log(chalk.green('Notification timed out!'));
    });
    console.log(chalk.green('Notification sent!'));
}