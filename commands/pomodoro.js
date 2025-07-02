import notifier from 'node-notifier';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pidFilePath = path.join(process.cwd(), '.pomodoro.pid');
console.log("pidFilePath", pidFilePath);

let timerId = null;
let sessionCount = 0;
const workDuration = 25 * 1000; // 25 seconds for testing
const breakDuration = 5 * 1000; // 5 seconds for testing

function sendInteractiveNotification(message, title, actions) {
    notifier.notify(
        {
            title: title,
            message: message,
            icon: path.join(__dirname, 'bot-icon.png'),
            sound: true,
            wait: true,
            actions: actions,
        },
        (err, response, metadata) => {
            if (err) {
                console.error('Notification error:', err);
                return;
            }

            if (metadata.activationValue === 'Start Break') {
                startBreak();
            } else if (metadata.activationValue === 'Start Session') {
                startWorkSession();
            } else if (metadata.activationValue === 'Stop') {
                // This will execute the full stopPomodoro logic within the background process
                stopPomodoro();
            }
        }
    );
}

function startTimer(duration, callback) {
    timerId = setTimeout(callback, duration);
}

function stopTimer() {
    if (timerId) {
        clearTimeout(timerId);
        timerId = null;
    }
}

function startWorkSession() {
    sessionCount++;
    console.log(`Starting Pomodoro session #${sessionCount}. Time to focus!`);
    sendInteractiveNotification(`Session #${sessionCount}. Time to focus!`, 'Pomodoro Started', []);
    startTimer(workDuration, onWorkSessionEnd);
}

function onWorkSessionEnd() {
    console.log('Work session complete. Time for a break!');
    sendInteractiveNotification('Work session complete. Time for a break!', 'Pomodoro Break', ['Start Break', 'Stop']);
    fs.unlinkSync(pidFilePath);
    // process.exit(0);
}

function startBreak() {
    console.log('Starting break.');
    sendInteractiveNotification('Time to relax.', 'Pomodoro Break', []);
    startTimer(breakDuration, onBreakEnd);
}

function onBreakEnd() {
    console.log('Break over. Time for the next session!');
    sendInteractiveNotification('Break over. Time for the next session!', 'Pomodoro', ['Start Session', 'Stop']);

}

export function startPomodoro(options) {
    console.log("options", options);
    if (options.runTimer === true) {
        // This is the background process
        process.on('SIGTERM', () => {
            stopTimer();
            process.exit(0);
        });
        console.log("Starting work session");
        startWorkSession();
        return;
    }

    // This is the command the user runs
    if (fs.existsSync(pidFilePath)) {
        console.log('A Pomodoro timer is already running. Use "bot pomodoro stop" to end it.');
        return;
    }

    console.log('Starting Pomodoro timer in the background...');

    const child = spawn(process.argv[0], [process.argv[1], 'pomodoro', 'start', '--run-timer'], {
        detached: true,
        stdio: 'ignore',
    });

    child.unref();

    fs.writeFileSync(pidFilePath, child.pid.toString());
    console.log(`Pomodoro timer started with PID: ${child.pid}.`);
}

export function stopPomodoro() {
    if (!fs.existsSync(pidFilePath)) {
        console.log('No Pomodoro timer is running.');
        return;
    }

    const pid = parseInt(fs.readFileSync(pidFilePath, 'utf8'), 10);
    console.log(`Stopping Pomodoro timer with PID: ${pid}...`);

    try {
        process.kill(pid, 'SIGTERM');
        console.log('Pomodoro timer stopped.');
    } catch (err) {
        console.error(`Failed to stop process ${pid}. It may have already been stopped.`);
    } finally {
        fs.unlinkSync(pidFilePath);
    }

    // This part is for when stop is triggered from a notification
    stopTimer();

    notifier.notify({
        title: 'Pomodoro',
        message: 'Pomodoro timer stopped.',
        icon: path.join(__dirname, 'bot-icon.png'),
    });
}
