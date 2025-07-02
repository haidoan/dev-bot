import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';

const VCB_API_URL = 'https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx';

async function getRates() {
  const spinner = ora('Fetching exchange rates...').start();
  try {
    const { data } = await axios.get(VCB_API_URL);
    spinner.succeed('Rates fetched!');
    return data;
  } catch (error) {
    spinner.fail('Failed to fetch rates.');
    console.error(chalk.red(error.message));
    return null;
  }
}

function parseRates(xmlData) {
    const rates = {};
    const regex = /<Exrate CurrencyCode="(\w+)" CurrencyName="([^"]+)" Buy="([^"]+)" Transfer="([^"]+)" Sell="([^"]+)"\/>/g;
    let match;
    while ((match = regex.exec(xmlData)) !== null) {
        rates[match[1]] = {
            name: match[2],
            buy: parseFloat(match[3].replace(/,/g, '')),
            transfer: parseFloat(match[4].replace(/,/g, '')),
            sell: parseFloat(match[5].replace(/,/g, '')),
        };
    }
    return rates;
}

export async function convertCurrency(amount, options) {
    const from = options.from || 'USD';
    const to = options.to || 'VND';
    const xmlData = await getRates();
    if (!xmlData) return;

    const rates = parseRates(xmlData);

    const fromRate = rates[from];
    const toRate = rates[to];

    if (from !== 'VND' && !fromRate) {
        console.error(chalk.red(`Currency ${from} not found.`));
        return;
    }
    if (to !== 'VND' && !toRate) {
        console.error(chalk.red(`Currency ${to} not found.`));
        return;
    }

    let result;
    if (from === 'VND') {
        result = amount / toRate.sell;
    } else if (to === 'VND') {
        result = amount * fromRate.buy;
    } else {
        // Convert to VND first
        const inVnd = amount * fromRate.buy;
        result = inVnd / toRate.sell;
    }

    console.log(
        `${chalk.yellow(amount)} ${chalk.blue(from)} = ${chalk.green(result.toFixed(2))} ${chalk.blue(to)}`
    );
}

