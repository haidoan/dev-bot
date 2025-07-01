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

export default function (program) {
  program
    .command('schedule')
    .description('Run the scheduler for notifications')
    .action(scheduleChecks);
}
