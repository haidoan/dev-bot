import { Command } from 'commander';
import jwt from 'jsonwebtoken';
import chalk from 'chalk';

function decodeJwt(token) {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded) {
    console.error(chalk.red('Invalid JWT token'));
    return;
  }
  console.log(chalk.blue('Header:'));
  console.log(decoded.header);
  console.log(chalk.blue('Payload:'));
  console.log(decoded.payload);
}

export default function (program) {
  program
    .command('jwt <token>')
    .description('Decode a JWT token')
    .action(decodeJwt);
}
