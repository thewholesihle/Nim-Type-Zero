'use strict';

require('dotenv').config();
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const CAPITEC_URL = process.env.CAPITEC_URL || 'https://internet.capitecbank.co.za';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'debug-screenshots');

// Selectors – override via env vars if Capitec updates their markup
const SEL = {
    username: process.env.CAPITEC_SEL_USERNAME || 'input[name="username"], input[id*="user"], input[placeholder*="sername"]',
    password: process.env.CAPITEC_SEL_PASSWORD || 'input[type="password"], input[id*="pass"], input[placeholder*="assword"]',
    submit:   process.env.CAPITEC_SEL_SUBMIT   || 'button[type="submit"], input[type="submit"]',
    otp:      process.env.CAPITEC_SEL_OTP      || 'input[name="otp"], input[placeholder*="OTP"], input[placeholder*="otp"], input[placeholder*="one-time"]',
    balance:  process.env.CAPITEC_SEL_BALANCE  || '[class*="balance"], [class*="amount"], [data-testid*="balance"]',
    account:  process.env.CAPITEC_SEL_ACCOUNT  || '[class*="account"], [class*="card"], [class*="product"]',
};

class CapitecService {
    constructor() {
        this.browser = null;
        this.page = null;
        this.loggedIn = false;
        this.awaitingOtp = false;
        this._otpResolve = null;
        this._otpReject = null;
    }

    async _ensureBrowser() {
        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                ],
            });
        }
        if (!this.page || this.page.isClosed()) {
            this.page = await this.browser.newPage();
            await this.page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
                '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            );
            await this.page.setViewport({ width: 1280, height: 800 });
        }
    }

    async _screenshot(name) {
        try {
            if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
            const file = path.join(SCREENSHOT_DIR, `${name}-${Date.now()}.png`);
            await this.page.screenshot({ path: file, fullPage: true });
            return file;
        } catch (_) {
            return null;
        }
    }

    // Waits for the user to supply an OTP via the WhatsApp /otp command.
    // Resolves with the code string, or rejects after timeout.
    _waitForOtp(timeoutMs = 5 * 60 * 1000) {
        this.awaitingOtp = true;
        return new Promise((resolve, reject) => {
            this._otpResolve = resolve;
            this._otpReject = reject;
            setTimeout(() => {
                this.awaitingOtp = false;
                reject(new Error('OTP timeout – please request balance again.'));
            }, timeoutMs);
        });
    }

    // Called externally by the /otp command handler
    submitOtp(code) {
        if (!this.awaitingOtp || !this._otpResolve) {
            return false;
        }
        this.awaitingOtp = false;
        this._otpResolve(code);
        return true;
    }

    async login() {
        const username = process.env.CAPITEC_USERNAME;
        const password = process.env.CAPITEC_PASSWORD;

        if (!username || !password) {
            throw new Error('CAPITEC_USERNAME and CAPITEC_PASSWORD must be set in .env');
        }

        await this._ensureBrowser();
        await this.page.goto(CAPITEC_URL, { waitUntil: 'networkidle2', timeout: 30000 });

        // Wait for login form
        await this.page.waitForSelector(SEL.username, { timeout: 15000 }).catch(() => {
            throw new Error('Login form not found – Capitec may have updated their site. Check CAPITEC_SEL_USERNAME.');
        });

        await this.page.$eval(SEL.username, (el, val) => { el.value = ''; el.value = val; }, username);
        await this.page.$eval(SEL.password, (el, val) => { el.value = ''; el.value = val; }, password);

        // Trigger input events so frameworks register the values
        await this.page.evaluate((uSel, pSel) => {
            const fire = el => ['input', 'change'].forEach(e => el.dispatchEvent(new Event(e, { bubbles: true })));
            fire(document.querySelector(uSel));
            fire(document.querySelector(pSel));
        }, SEL.username.split(',')[0].trim(), SEL.password.split(',')[0].trim());

        await this.page.click(SEL.submit.split(',')[0].trim());
        await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});

        // Detect OTP page
        const otpField = await this.page.$(SEL.otp).catch(() => null);
        if (otpField) {
            this.awaitingOtp = true;
            // Signal caller that OTP is needed
            throw Object.assign(new Error('OTP_REQUIRED'), { code: 'OTP_REQUIRED' });
        }

        // Verify login success by checking we're no longer on the login page
        const currentUrl = this.page.url();
        if (currentUrl.includes('login') || currentUrl.includes('signin')) {
            await this._screenshot('login-failed');
            throw new Error('Login failed – wrong credentials or Capitec changed their login flow. Check debug-screenshots/.');
        }

        this.loggedIn = true;
    }

    async continueWithOtp(code) {
        if (!this.page) throw new Error('No active session – start with /balance first.');

        await this.page.waitForSelector(SEL.otp, { timeout: 5000 }).catch(() => {
            throw new Error('OTP field not found on page.');
        });

        await this.page.$eval(SEL.otp, (el, val) => { el.value = val; }, code);
        await this.page.evaluate(otpSel => {
            const el = document.querySelector(otpSel);
            if (el) ['input', 'change'].forEach(e => el.dispatchEvent(new Event(e, { bubbles: true })));
        }, SEL.otp.split(',')[0].trim());

        await this.page.click(SEL.submit.split(',')[0].trim());
        await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});

        const currentUrl = this.page.url();
        if (currentUrl.includes('login') || currentUrl.includes('signin') || currentUrl.includes('otp')) {
            await this._screenshot('otp-failed');
            throw new Error('OTP rejected – please try /balance again.');
        }

        this.loggedIn = true;
        this.awaitingOtp = false;
    }

    async getBalance() {
        if (!this.loggedIn) {
            await this.login();
        }

        // Navigate to accounts/dashboard if not already there
        const url = this.page.url();
        if (!url.includes('account') && !url.includes('dashboard') && !url.includes('overview')) {
            await this.page.goto(`${CAPITEC_URL}/dashboard`, { waitUntil: 'networkidle2', timeout: 20000 })
                .catch(() => this.page.goto(CAPITEC_URL, { waitUntil: 'networkidle2', timeout: 20000 }));
        }

        // Wait for balance elements to appear
        await this.page.waitForSelector(SEL.balance, { timeout: 10000 }).catch(() => {
            throw new Error('Balance elements not found. Check CAPITEC_SEL_BALANCE or see debug-screenshots/.');
        });

        await this._screenshot('balance-page');

        // Extract all account names + balances
        const accounts = await this.page.evaluate((balanceSel, accountSel) => {
            const results = [];

            // Strategy 1: find dedicated balance/amount elements
            const balEls = Array.from(document.querySelectorAll(balanceSel));
            balEls.forEach(el => {
                const text = el.innerText.trim();
                if (/R\s*[\d,]+/.test(text) || /[\d,]+\.\d{2}/.test(text)) {
                    // Try to find a sibling/parent label
                    const parent = el.closest('[class*="account"], [class*="card"], [class*="product"]') || el.parentElement;
                    const label = parent ? (parent.querySelector('h1,h2,h3,h4,h5,h6,span,[class*="name"],[class*="title"]') || {}).innerText || '' : '';
                    results.push({ account: label.trim() || 'Account', balance: text });
                }
            });

            return results.length ? results : null;
        }, SEL.balance, SEL.account);

        if (!accounts || accounts.length === 0) {
            // Fallback: try to get any text matching ZAR amounts
            const rawText = await this.page.evaluate(() => {
                const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
                const lines = [];
                let node;
                while ((node = walker.nextNode())) {
                    if (/R\s*[\d,]+\.?\d{0,2}/.test(node.textContent)) {
                        lines.push(node.textContent.trim());
                    }
                }
                return [...new Set(lines)].slice(0, 5);
            });

            if (rawText && rawText.length > 0) {
                return rawText.join('\n');
            }

            await this._screenshot('no-balance-found');
            throw new Error('Could not extract balance. Check debug-screenshots/ and update CAPITEC_SEL_BALANCE.');
        }

        return accounts;
    }

    async logout() {
        if (this.page && !this.page.isClosed()) {
            try {
                await this.page.goto(`${CAPITEC_URL}/logout`, { waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
            } catch (_) {}
        }
        this.loggedIn = false;
        await this._close();
    }

    async _close() {
        if (this.page && !this.page.isClosed()) await this.page.close().catch(() => {});
        this.page = null;
        this.loggedIn = false;
    }

    async destroy() {
        await this._close();
        if (this.browser) {
            await this.browser.close().catch(() => {});
            this.browser = null;
        }
    }
}

module.exports = new CapitecService();
