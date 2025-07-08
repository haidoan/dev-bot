import jwt from 'jsonwebtoken';
import chalk from 'chalk';

export function decodeJwt(token) {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded) {
    console.error(chalk.red('Invalid JWT token'));
    return;
  }
  console.log(chalk.blue('Header:'));
  console.log(JSON.stringify(decoded.header, null, 2));
  console.log(chalk.blue('Payload:'));
  console.log(JSON.stringify(decoded.payload, null, 2));
}

