import { Command } from 'commander';
import notifier from 'node-notifier';
import chalk from 'chalk';
import axios from 'axios';
import ora from 'ora';

const VCB_API_URL = 'https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx';

async function getUsdToVndRate() {
    try {
        const { data } = await axios.get(VCB_API_URL);
        const match = data.match(/<Exrate CurrencyCode="USD"[^>]*Sell="([^"]+)"/);
        if (match) {
            return match[1];
        }
    } catch (error) {
        return null;
    }
    return null;
}

function scheduleChecks() {
    const spinner = ora('Scheduler started. Waiting for tasks...').start();

    setInterval(async () => {
        const now = new Date();
        spinner.text = `Scheduler running. Last check: ${now.toLocaleTimeString()}`;

        // Check for the 25th of the month
        if (now.getDate() === 25) {
            // Only run once per day
            if (now.getHours() === 9 && now.getMinutes() === 0) {
                const rate = await getUsdToVndRate();
                if (rate) {
                    notifier.notify({
                        title: 'Currency Rate',
                        message: `USD to VND: ${rate}`,
                    });
                }
            }
        }
    }, 60 * 1000); // Check every minute
}

function startPomodoro() {
    if (pomodoroTimer) {
        console.log(chalk.yellow('⚠️  Pomodoro is already running!'));
        return;
    }

    isBreak = false;
    console.log(chalk.green('🍅 Starting Pomodoro - 25 minutes work session'));
    notifier.notify({
        title: 'Pomodoro Started',
        message: 'Focus time! 25 minutes work session started',
        icon: './commands/bot-icon.png'
    });

    function runTimer() {
        if (isBreak) {
            console.log(chalk.blue('☕️ Break time - 5 minutes'));
            notifier.notify({
                title: 'Break Time',
                message: 'Take a 5-minute break!',
                icon: './commands/bot-icon.png'
            });
            pomodoroTimer = setTimeout(() => {
                isBreak = false;
                notifier.notify({
                    title: 'Break Ended',
                    message: 'Ready to start another Pomodoro?',
                    icon: './commands/bot-icon.png'
                });
                pomodoroTimer = null;
            }, POMODORO_BREAK_TIME);
        } else {
            pomodoroTimer = setTimeout(() => {
                isBreak = true;
                notifier.notify({
                    title: 'Pomodoro Completed',
                    message: 'Great work! Time for a break',
                    icon: './commands/bot-icon.png'
                });
                runTimer();
            }, POMODORO_WORK_TIME);
        }
    }

    runTimer();
}

function stopPomodoro() {
    if (!pomodoroTimer) {
        console.log(chalk.yellow('⚠️  No Pomodoro timer is running'));
        return;
    }

    clearTimeout(pomodoroTimer);
    pomodoroTimer = null;
    console.log(chalk.red('⏹  Pomodoro stopped'));
    notifier.notify({
        title: 'Pomodoro Stopped',
        message: 'Timer has been stopped',
        icon: './commands/bot-icon.png'
    });
}

export { startPomodoro, stopPomodoro };

export default function (program) {
    program
        .command('schedule')
        .description('Run the scheduler for notifications')
        .action(scheduleChecks);

    program
        .command('pomodoro')
        .description('Start a Pomodoro timer (25min work + 5min break)')
        .action(startPomodoro);

    program
        .command('pomodoro:stop')
        .description('Stop the running Pomodoro timer')
        .action(stopPomodoro);
}
