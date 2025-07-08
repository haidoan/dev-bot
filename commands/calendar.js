import { google } from 'googleapis';
import chalk from 'chalk';
import ora from 'ora';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import http from 'http';
import { URL } from 'url';



// test
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Google Calendar setup
const SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send'
];
const TOKEN_PATH = path.join(__dirname, '../.google-token.json');
const CREDENTIALS_PATH = path.join(__dirname, '../.google-credentials.json');

async function loadCredentials() {
    try {
        const credentials = await fs.readFile(CREDENTIALS_PATH, 'utf8');
        return JSON.parse(credentials);
    } catch (error) {
        throw new Error('Please create .google-credentials.json file with your Google API credentials');
    }
}

async function loadToken() {
    try {
        const token = await fs.readFile(TOKEN_PATH, 'utf8');
        return JSON.parse(token);
    } catch (error) {
        return null;
    }
}

async function saveToken(token) {
    await fs.writeFile(TOKEN_PATH, JSON.stringify(token, null, 2));
}

function startAuthServer(oAuth2Client) {
    return new Promise((resolve, reject) => {
        const server = http.createServer(async (req, res) => {
            const url = new URL(req.url, 'http://localhost:3000');

            if (url.pathname === '/') {
                const code = url.searchParams.get('code');
                const error = url.searchParams.get('error');

                if (error) {
                    res.writeHead(400, { 'Content-Type': 'text/html' });
                    res.end(`<h1>Authorization Failed</h1><p>Error: ${error}</p><p>You can close this window.</p>`);
                    server.close();
                    reject(new Error(`Authorization failed: ${error}`));
                    return;
                }

                if (code) {
                    try {
                        const { tokens } = await oAuth2Client.getToken(code);
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(`
                            <h1>✅ Authorization Successful!</h1>
                            <p>You can close this window and return to your terminal.</p>
                            <script>setTimeout(() => window.close(), 2000);</script>
                        `);
                        server.close();
                        resolve(tokens);
                    } catch (error) {
                        res.writeHead(500, { 'Content-Type': 'text/html' });
                        res.end(`<h1>Token Exchange Failed</h1><p>${error.message}</p>`);
                        server.close();
                        reject(error);
                    }
                    return;
                }
            }

            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>Not Found</h1>');
        });

        server.listen(3000, 'localhost', () => {
            console.log(chalk.green('🚀 Started temporary auth server on http://localhost:3000'));
        });

        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                reject(new Error('Port 3000 is already in use. Please free up the port and try again.'));
            } else {
                reject(error);
            }
        });
    });
}

async function authorize() {
    const credentials = await loadCredentials();

    const oauthCreds = credentials.installed || credentials.web;
    if (!oauthCreds) {
        throw new Error('Invalid credentials format. Expected "installed" or "web" property in .google-credentials.json');
    }

    const { client_secret, client_id } = oauthCreds;

    // Use localhost for the redirect URI
    const redirectUri = 'http://localhost:3000';

    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri);

    // Check if we have previously stored a token
    const token = await loadToken();
    if (token) {
        oAuth2Client.setCredentials(token);
        return oAuth2Client;
    }

    // If no token, need to authorize
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });

    console.log(chalk.yellow('\n🔐 Google Calendar Authorization Required'));
    console.log(chalk.yellow('Opening your browser for authorization...'));
    console.log(chalk.gray('If the browser doesn\'t open, visit this URL manually:'));
    console.log(chalk.blue(authUrl));

    try {
        // Start the temporary server to catch the callback
        const tokens = await startAuthServer(oAuth2Client);

        // Open the browser (this will work on most systems)
        const { spawn } = await import('child_process');
        const platform = process.platform;
        const command = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
        spawn(command, [authUrl], { detached: true, stdio: 'ignore' });

        // Wait for the authorization to complete
        oAuth2Client.setCredentials(tokens);
        await saveToken(tokens);
        console.log(chalk.green('\n✅ Authorization successful! Token saved.'));
        return oAuth2Client;

    } catch (error) {
        console.error(chalk.red(`\n❌ Authorization failed: ${error.message}`));
        throw error;
    }
}

function getWeekRange() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get Monday of current week
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    // Get Sunday of current week
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { start: monday, end: sunday };
}

function getTodayRange() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);

    return { start: startOfDay, end: endOfDay };
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}

function formatTime(dateTime) {
    const date = new Date(dateTime);
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function extractZoomUrl(event) {
    // Check conferenceData.note for Zoom URL
    if (event.conferenceData && event.conferenceData.notes) {
        const notes = event.conferenceData.notes;
        // Look for Zoom URL in HTML format
        const zoomRegex = /href="([^"]*zoom\.us[^"]*)"/i;
        const match = notes.match(zoomRegex);
        if (match) {
            // Decode the URL
            let zoomUrl = match[1];
            // Handle Google's URL redirection
            if (zoomUrl.includes('google.com/url?q=')) {
                const urlParams = new URLSearchParams(zoomUrl.split('?')[1]);
                zoomUrl = urlParams.get('q') || zoomUrl;
            }
            // Decode HTML entities
            zoomUrl = zoomUrl.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            return zoomUrl;
        }
    }

    // Check regular description for Zoom URLs
    if (event.description) {
        const zoomRegex = /https?:\/\/[^\s]*zoom\.us\/[^\s]*/i;
        const match = event.description.match(zoomRegex);
        if (match) {
            return match[0];
        }
    }

    return null;
}

async function getCalendarEvents(timeMin, timeMax) {
    const auth = await authorize();
    const calendar = google.calendar({ version: 'v3', auth });
    const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
    });
    return response.data.items || [];
}

function formatEventsForAI(events) {
    if (!events || events.length === 0) {
        return { events: [], summary: 'No upcoming events found.' };
    }

    const formattedEvents = events.map(event => {
        const startTime = event.start.dateTime || event.start.date;
        const endTime = event.end.dateTime || event.end.date;
        return {
            summary: event.summary,
            description: event.description,
            location: event.location,
            start: startTime,
            end: endTime,
            hangoutLink: event.hangoutLink,
            zoomLink: extractZoomUrl(event),
            attendees: event.attendees ? event.attendees.map(a => a.email) : [],
        };
    });

    return {
        event_count: formattedEvents.length,
        events: formattedEvents,
    };
}

export async function getWeeklyCalendarForAI() {
    const { start, end } = getWeekRange();
    const events = await getCalendarEvents(start, end);
    return formatEventsForAI(events);
}

export async function getDailyCalendarForAI() {
    const { start, end } = getTodayRange();
    const events = await getCalendarEvents(start, end);
    return formatEventsForAI(events);
}

export async function listWeeklyMeetings() {
    const spinner = ora('Fetching Google Calendar events...').start();

    try {
        const { start, end } = getWeekRange();
        spinner.text = 'Loading calendar events...';
        const events = await getCalendarEvents(start, end);
        spinner.stop();

        console.log(chalk.bold(`\n📅 Calendar for week of ${formatDate(start)} - ${formatDate(end)}\n`));

        if (events.length === 0) {
            console.log(chalk.yellow('No meetings found for this week.'));
            return;
        }

        // Group events by day
        const eventsByDay = {};
        events.forEach(event => {
            const eventDate = new Date(event.start.dateTime || event.start.date);
            const dayKey = eventDate.toDateString();

            if (!eventsByDay[dayKey]) {
                eventsByDay[dayKey] = [];
            }
            eventsByDay[dayKey].push(event);
        });

        // Display events grouped by day
        Object.keys(eventsByDay).forEach(dayKey => {
            const date = new Date(dayKey);
            console.log(chalk.cyan(`\n${formatDate(date)}:`));

            eventsByDay[dayKey].forEach(event => {
                const startTime = event.start.dateTime ? formatTime(event.start.dateTime) : 'All day';
                const endTime = event.end.dateTime ? formatTime(event.end.dateTime) : '';
                const timeStr = endTime ? `${startTime} - ${endTime}` : startTime;

                console.log(`  ${chalk.green('•')} ${timeStr} - ${event.summary || 'No title'}`);

                if (event.description) {
                    const shortDesc = event.description.length > 60
                        ? event.description.substring(0, 60) + '...'
                        : event.description;
                    console.log(`    ${chalk.gray(shortDesc)}`);
                }

                // Check for Zoom URL
                const zoomUrl = extractZoomUrl(event);
                if (zoomUrl) {
                    console.log(`    🔗 ${chalk.blue(zoomUrl)}`);
                }

                // Check for Google Meet
                if (event.hangoutLink) {
                    console.log(`    💻 ${chalk.blue(event.hangoutLink)}`);
                }

                if (event.attendees && event.attendees.length > 1) {
                    const attendeeCount = event.attendees.length;
                    console.log(`    ${chalk.gray(`${attendeeCount} attendees`)}`);
                }
            });
        });

        console.log(chalk.green(`\n✓ Found ${events.length} events this week`));
    } catch (error) {
        spinner.fail('Failed to fetch calendar events.');

        if (error.message.includes('Authorization required')) {
            console.error(chalk.yellow(error.message));
        } else if (error.message.includes('credentials')) {
            console.error(chalk.red(error.message));
            console.log(chalk.yellow('\nTo setup Google Calendar integration:'));
            console.log('1. Go to https://console.cloud.google.com/');
            console.log('2. Create a new project or select existing one');
            console.log('3. Enable Google Calendar API');
            console.log('4. Create credentials (OAuth 2.0 client ID)');
            console.log('5. Choose "Desktop application" as application type');
            console.log('6. Download the credentials.json file');
            console.log('7. Save it as .google-credentials.json in your project root');
        } else if (error.message.includes('redirect_uri_mismatch')) {
            console.error(chalk.red(error.message));
            console.log(chalk.yellow('\nRedirect URI mismatch error:'));
            console.log('1. Go to https://console.cloud.google.com/');
            console.log('2. APIs & Services > Credentials');
            console.log('3. Click on your OAuth 2.0 Client ID');
            console.log('4. Add http://localhost:3000 to "Authorized redirect URIs"');
            console.log('5. Save and try again');
        } else {
            console.error(chalk.red(error.message));
        }
    }
}

export async function listTodayMeetings() {
    const spinner = ora('Fetching today\'s calendar events...').start();

    try {
        const { start, end } = getTodayRange();
        spinner.text = 'Loading today\'s events...';
        const events = await getCalendarEvents(start, end);
        spinner.stop();

        const today = new Date();
        console.log(chalk.bold(`\n📅 Today's Calendar - ${formatDate(today)}\n`));

        if (events.length === 0) {
            console.log(chalk.yellow('No meetings scheduled for today.'));
            return;
        }

        // Display events for today
        events.forEach((event, index) => {
            const startTime = event.start.dateTime ? formatTime(event.start.dateTime) : 'All day';
            const endTime = event.end.dateTime ? formatTime(event.end.dateTime) : '';
            const timeStr = endTime ? `${startTime} - ${endTime}` : startTime;

            console.log(`${chalk.green('•')} ${chalk.bold(timeStr)} - ${event.summary || 'No title'}`);

            if (event.description) {
                const shortDesc = event.description.length > 80
                    ? event.description.substring(0, 80) + '...'
                    : event.description;
                console.log(`  ${chalk.gray(shortDesc)}`);
            }

            if (event.location) {
                console.log(`  📍 ${chalk.gray(event.location)}`);
            }

            // Check for Zoom URL
            const zoomUrl = extractZoomUrl(event);
            if (zoomUrl) {
                console.log(`  🔗 ${chalk.blue(zoomUrl)}`);
            }

            // Check for Google Meet
            if (event.hangoutLink) {
                console.log(`  💻 ${chalk.blue(event.hangoutLink)}`);
            }

            if (event.attendees && event.attendees.length > 1) {
                const attendeeCount = event.attendees.length;
                console.log(`  👥 ${chalk.gray(`${attendeeCount} attendees`)}`);
            }

            // Add spacing between events except for the last one
            if (index < events.length - 1) {
                console.log('');
            }
        });

        console.log(chalk.green(`\n✓ Found ${events.length} events today`));

    } catch (error) {
        spinner.fail('Failed to fetch today\'s calendar events.');

        if (error.message.includes('Authorization required')) {
            console.error(chalk.yellow(error.message));
        } else if (error.message.includes('credentials')) {
            console.error(chalk.red(error.message));
            console.log(chalk.yellow('\nTo setup Google Calendar integration:'));
            console.log('1. Go to https://console.cloud.google.com/');
            console.log('2. Create a new project or select existing one');
            console.log('3. Enable Google Calendar API');
            console.log('4. Create credentials (OAuth 2.0 client ID)');
            console.log('5. Choose "Web application" as application type');
            console.log('6. Add http://localhost:3000 to "Authorized redirect URIs"');
            console.log('7. Download the credentials.json file');
            console.log('8. Save it as .google-credentials.json in your project root');
        } else if (error.message.includes('redirect_uri_mismatch')) {
            console.error(chalk.red(error.message));
            console.log(chalk.yellow('\nRedirect URI mismatch error:'));
            console.log('1. Go to https://console.cloud.google.com/');
            console.log('2. APIs & Services > Credentials');
            console.log('3. Click on your OAuth 2.0 Client ID');
            console.log('4. Add http://localhost:3000 to "Authorized redirect URIs"');
            console.log('5. Save and try again');
        } else {
            console.error(chalk.red(error.message));
        }
    }
}



export async function addEventForAI({ summary, description, location, start, end, attendees }) {
    const auth = await authorize();
    const calendar = google.calendar({ version: 'v3', auth });

    const event = {
        summary,
        description,
        location,
        start: {
            dateTime: start,
            timeZone: 'UTC',
        },
        end: {
            dateTime: end,
            timeZone: 'UTC',
        },
        attendees: attendees ? attendees.map(email => ({ email })) : [],
    };

    const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
    });

    return {
        summary: 'Event created successfully.',
        htmlLink: response.data.htmlLink,
        eventId: response.data.id,
    };
}

export async function addCalendarEvent(summary, startTime, endTime, description, location, attendees) {
    const spinner = ora('Creating new calendar event...').start();

    try {
        const auth = await authorize();
        const calendar = google.calendar({ version: 'v3', auth });

        const event = {
            summary,
            description,
            location,
            start: {
                dateTime: new Date(startTime).toISOString(),
                timeZone: 'UTC',
            },
            end: {
                dateTime: new Date(endTime).toISOString(),
                timeZone: 'UTC',
            },
            attendees: attendees ? attendees.split(',').map(email => ({ email: email.trim() })) : [],
        };

        const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
        });

        spinner.succeed(chalk.green('✓ Event created successfully!'));
        console.log(`  ${chalk.bold('Event:')} ${response.data.summary}`);
        console.log(`  ${chalk.bold('Link:')} ${chalk.blue(response.data.htmlLink)}`);

        return response.data;

    } catch (error) {
        spinner.fail('Failed to create event.');
        if (error.message.includes('invalid_grant')) {
            console.error(chalk.red('Authentication error. Your token might be expired or invalid.'));
            console.log(chalk.yellow('Try deleting .google-token.json and re-authorizing.'));
        } else {
            console.error(chalk.red(error.message));
        }
        throw error;
    }
}

