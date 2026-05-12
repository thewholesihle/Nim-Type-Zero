'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { handleCommand } = require('./commands');
const capitec = require('./services/capitec');

const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'capitec-whatsapp-bot' }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
        ],
    },
});

client.on('qr', qr => {
    console.log('\nScan this QR code with WhatsApp (Linked Devices):\n');
    qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
    console.log('WhatsApp authenticated.');
});

client.on('auth_failure', msg => {
    console.error('WhatsApp authentication failed:', msg);
});

client.on('ready', () => {
    console.log(`\nBot ready. Listening for commands (prefix: /)\n` +
        `Authorized numbers: ${process.env.ALLOWED_NUMBERS || '(none set – add ALLOWED_NUMBERS to .env)'}`);
});

client.on('message', async msg => {
    // Only handle text messages starting with /
    if (!msg.body || !msg.body.startsWith('/')) return;

    // Skip group messages unless the message mentions the bot
    // (remove the guard below if you want group support)
    if (msg.from.endsWith('@g.us')) return;

    const from = msg.from;
    console.log(`[${new Date().toISOString()}] ${from}: ${msg.body}`);

    try {
        const reply = await handleCommand(msg.body, from);
        await msg.reply(reply);
    } catch (err) {
        console.error('Unhandled error in command handler:', err);
        await msg.reply('An unexpected error occurred. Please try again.').catch(() => {});
    }
});

client.on('disconnected', reason => {
    console.log('WhatsApp disconnected:', reason);
});

// Graceful shutdown
async function shutdown(signal) {
    console.log(`\nReceived ${signal}. Shutting down...`);
    await capitec.destroy().catch(() => {});
    await client.destroy().catch(() => {});
    process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

console.log('Starting WhatsApp bot...');
client.initialize();
