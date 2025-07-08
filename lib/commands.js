import { decodeJwt } from '../commands/jwt.js';
import { convertCurrency } from '../commands/currency.js';
import { sendNotification } from '../commands/notify.js';

export const commandRegistry = [
    {
        name: 'jwt',
        description: 'Decode a JWT token',
        action: decodeJwt,
        args: [{ name: '<token>', description: 'The JWT token to decode' }],
    },
    {
        name: 'currency',
        description: 'Convert currency using Vietcombank rates',
        action: convertCurrency,
        args: [{ name: '<amount>', description: 'Amount to convert' }],
        options: [
            { flag: '-f, --from <currency>', description: 'From currency' },
            { flag: '-t, --to <currency>', description: 'To currency' },
        ],
    },
    {
        name: 'notify',
        description: 'Send a desktop notification',
        action: sendNotification,
        args: [{ name: '<message>', description: 'The message to send' }],
        options: [
            { flag: '-t, --title <title>', description: 'Notification title' },
        ],
    }
];
