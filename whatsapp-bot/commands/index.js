'use strict';

const capitec = require('../services/capitec');

// Allowed phone numbers (WhatsApp format: countrycode+number, no + or spaces)
// e.g. ALLOWED_NUMBERS=27821234567,27831234567
function getAllowedNumbers() {
    const raw = process.env.ALLOWED_NUMBERS || '';
    return raw.split(',').map(n => n.trim()).filter(Boolean);
}

function isAuthorized(from) {
    const allowed = getAllowedNumbers();
    if (allowed.length === 0) return false;
    // WhatsApp from format: "27821234567@c.us"
    const number = from.replace('@c.us', '').replace('@g.us', '');
    return allowed.includes(number);
}

function formatBalance(accounts) {
    if (typeof accounts === 'string') return `*Capitec Balance*\n\n${accounts}`;

    const lines = accounts.map(a => `• *${a.account}*: ${a.balance}`).join('\n');
    return `*Capitec Account Balance*\n\n${lines}\n\n_Updated: ${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}_`;
}

const HELP_TEXT = `*Available Commands*

/balance – Fetch your Capitec account balance
/bal     – Alias for /balance
/otp <code> – Submit OTP when prompted after /balance
/ping    – Check if the bot is running
/logout  – Clear Capitec session (force re-login next time)
/help    – Show this message

_Commands prefixed with / only. Balance commands are restricted to authorized numbers._`;

async function handleCommand(body, from) {
    const parts = body.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
        case '/ping':
            return 'Pong! Bot is alive and running.';

        case '/help':
            return HELP_TEXT;

        case '/balance':
        case '/bal': {
            if (!isAuthorized(from)) {
                return 'You are not authorized to fetch balance. Ask the bot owner to add your number to ALLOWED_NUMBERS.';
            }

            // If we're mid-OTP flow, remind the user
            if (capitec.awaitingOtp) {
                return 'Waiting for OTP. Please send: /otp YOUR_CODE\n\nOr wait for it to timeout and try /balance again.';
            }

            try {
                const accounts = await capitec.getBalance();
                return formatBalance(accounts);
            } catch (err) {
                if (err.code === 'OTP_REQUIRED') {
                    return 'Capitec sent you an OTP to your registered number.\nPlease reply with:\n\n/otp YOUR_CODE';
                }
                return `Error fetching balance: ${err.message}`;
            }
        }

        case '/otp': {
            if (!isAuthorized(from)) {
                return 'You are not authorized.';
            }

            const code = args[0];
            if (!code) return 'Usage: /otp <6-digit-code>';

            if (!capitec.awaitingOtp) {
                return 'No OTP is expected right now. Use /balance first.';
            }

            try {
                await capitec.continueWithOtp(code);
                const accounts = await capitec.getBalance();
                return formatBalance(accounts);
            } catch (err) {
                return `OTP error: ${err.message}`;
            }
        }

        case '/logout': {
            if (!isAuthorized(from)) {
                return 'You are not authorized.';
            }
            await capitec.logout();
            return 'Capitec session cleared. Next /balance will log in fresh.';
        }

        default:
            return `Unknown command: *${cmd}*\nSend /help to see available commands.`;
    }
}

module.exports = { handleCommand };
