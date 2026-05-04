/*
    Nim Type Zero — v2
    By: trinitysenpai  |  siphesihlebomela@gmail.com  |  MIT
*/

console.log('Nim Type Zero v2 | Cheat: iDontLikeThree()');

// ── Suits ──────────────────────────────────────────────────
const SUITS    = ['♠', '♣', '♥', '♦'];
const RED_SUITS = new Set(['♥', '♦']);

// ── Bot personalities ──────────────────────────────────────
const BOT_CONFIG = [
    { slot: 1, name: 'Kirari',  difficulty: 'beginner',      icon: '♠' },
    { slot: 2, name: 'Yumemi',  difficulty: 'intermediate',  icon: '♣' },
    { slot: 3, name: 'Yumeko',  difficulty: 'expert',        icon: '♥' },
];

// ── Shared game state ──────────────────────────────────────
const state = {
    total:          0,
    playerCardsLeft: 4,
    playerWaitTime: 5500,
    bots:           [],
    isPlayerTurn:   false,
    gameOver:       false,
    clickLocked:    false,
};

// ── Utility: promise-based delay ───────────────────────────
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// ── Username / cookie ──────────────────────────────────────
const overlay        = document.getElementById('overlay');
const usernameModal  = document.getElementById('usernameModal');
const playerIndicator = document.getElementById('playerIndicator');

if (document.cookie) {
    usernameModal.classList.add('active');
    const name = document.cookie.replace('username=', '').trim().replace(/\s*=\s*/, '');
    playerIndicator.textContent = name || 'You';
} else {
    overlay.classList.add('show');
}

// ── DOM references (resolved after page load) ──────────────
window.onload = () => {

    const totalElem      = document.getElementById('total');
    const logElem        = document.getElementById('gameLog');
    const cardContainer  = document.getElementById('playerCards');
    const cardsElem      = document.querySelectorAll('.card');
    const flyingCard     = document.getElementById('flyingCard');
    const turnBanner     = document.getElementById('turnBanner');
    const resultScreen   = document.getElementById('resultScreen');
    const gameTable      = document.getElementById('gameTable');
    const botStatElems   = document.querySelectorAll('.bot-stats');

    // ── Sound ────────────────────────────────────────────────
    function playSound(file) {
        const sound = new Howl({ src: [file], rate: 1.2, volume: 0.22, preload: true });
        sound.play();
    }

    // ── Total helpers ────────────────────────────────────────
    function setTotal(value) {
        state.total = value;
        totalElem.classList.remove('pop', 'danger');
        void totalElem.offsetWidth;         // reflow to restart CSS animation
        totalElem.textContent = value;
        totalElem.classList.add('pop');
        if (value >= 7) totalElem.classList.add('danger');
    }

    // ── Log ──────────────────────────────────────────────────
    function sendLog(html) {
        logElem.innerHTML += html + '<br>';
        logElem.scrollTop = logElem.scrollHeight;
    }

    // ── Turn Banner ──────────────────────────────────────────
    async function showTurnBanner(text) {
        const textEl = turnBanner.querySelector('.turn-banner__text');
        textEl.textContent = text;
        turnBanner.classList.remove('leaving');
        turnBanner.classList.add('visible');
        await delay(950);
        turnBanner.classList.replace('visible', 'leaving');
        await delay(420);
        turnBanner.classList.remove('leaving');
    }

    // ── Result Screen ────────────────────────────────────────
    function showResult(won) {
        state.gameOver = true;
        const titleEl  = resultScreen.querySelector('.result-screen__title');
        const subEl    = resultScreen.querySelector('.result-screen__subtitle');
        const suitEl   = resultScreen.querySelector('.result-screen__suit');

        resultScreen.classList.remove('win', 'lose');
        if (won) {
            resultScreen.classList.add('win');
            titleEl.textContent  = 'VICTORY';
            subEl.textContent    = 'You outlasted all opponents.';
            suitEl.textContent   = '♦';
        } else {
            resultScreen.classList.add('lose');
            titleEl.textContent  = 'DEFEAT';
            subEl.textContent    = 'The total exceeded 9.';
            suitEl.textContent   = '♠';
        }
        resultScreen.classList.add('active');
        resultScreen.querySelector('.result-screen__btn').addEventListener(
            'click', () => location.reload(), { once: true }
        );
    }

    // ── Screen shake ─────────────────────────────────────────
    function screenShake() {
        document.body.classList.add('shake');
        document.body.addEventListener('animationend', () => {
            document.body.classList.remove('shake');
        }, { once: true });
    }

    // ── Card deal animation ──────────────────────────────────
    function animateDeal() {
        cardsElem.forEach((card, i) => {
            card.style.setProperty('--deal-rot', `${(Math.random() * 6 - 3).toFixed(1)}deg`);
            card.classList.remove('dealing');
            void card.offsetWidth;
            card.style.animationDelay = `${i * 80}ms`;
            card.classList.add('dealing');
        });
    }

    // ── Flying card animation ────────────────────────────────
    async function animateCardThrow(cardEl) {
        const cardRect  = cardEl.getBoundingClientRect();
        const tableRect = gameTable.getBoundingClientRect();
        const destX = tableRect.left + tableRect.width  / 2;
        const destY = tableRect.top  + tableRect.height / 2;

        flyingCard.textContent = cardEl.querySelector('.card-value').textContent;
        flyingCard.style.cssText = `
            left:   ${cardRect.left}px;
            top:    ${cardRect.top}px;
            width:  ${cardRect.width}px;
            height: ${cardRect.height}px;
            --fly-x: ${destX - cardRect.left - cardRect.width  / 2}px;
            --fly-y: ${destY - cardRect.top  - cardRect.height / 2}px;
            --fly-rot: ${Math.random() > 0.5 ? '15' : '-15'}deg;
        `;
        flyingCard.classList.add('active');
        await delay(580);
        flyingCard.classList.remove('active');
    }

    // ── Give player cards ────────────────────────────────────
    function givePlayerCards() {
        cardsElem.forEach(card => {
            const value = Math.floor(Math.random() * 4);
            const suit  = SUITS[Math.floor(Math.random() * SUITS.length)];
            card.querySelector('.card-value').textContent      = value;
            card.querySelector('.card-suit').textContent       = suit;
            card.querySelector('.card-corner--tl').textContent = `${value}${suit}`;
            card.querySelector('.card-corner--br').textContent = `${value}${suit}`;
            card.dataset.value = value;

            card.classList.remove('suit-hearts', 'suit-diamonds');
            if (RED_SUITS.has(suit)) card.classList.add(`suit-${suit === '♥' ? 'hearts' : 'diamonds'}`);

            card.style.display = 'flex';
        });
    }

    function displayEveryCard() {
        cardsElem.forEach(card => { card.style.display = 'flex'; });
    }

    // ── Toggle card visibility ───────────────────────────────
    function setCardsVisible(visible) {
        cardContainer.classList.toggle('hideCards', !visible);
    }

    // ── Indicate whose turn it is ────────────────────────────
    function setPlayerTurn(on) {
        state.isPlayerTurn = on;
        playerIndicator.classList.toggle('is-turn', on);
        setCardsVisible(on);
        if (on) state.clickLocked = false;
    }

    // ── Bot stats display ────────────────────────────────────
    function updateBotStats() {
        const allBots = [bot1, bot2, bot3];
        allBots.forEach((bot, i) => {
            botStatElems[i].textContent = `Cards left: ${bot.cardsLeft}`;
        });

        // Update thrown-card mini displays
        document.querySelectorAll('.cards-thrown').forEach((zone, bi) => {
            const bot = allBots[bi];
            const spans = zone.querySelectorAll('.thrown-card');
            spans.forEach((span, j) => {
                const val = bot.cardsThrown[j];
                span.textContent = (val !== undefined) ? val : '';
            });
        });
    }

    // ────────────────────────────────────────────────────────
    // ── BOT CLASS ────────────────────────────────────────────
    // ────────────────────────────────────────────────────────
    class Bot {
        constructor(config) {
            this.slot       = config.slot;
            this.name       = config.name;
            this.difficulty = config.difficulty;
            this.elem       = document.querySelectorAll('.bot')[config.slot - 1];
            this.thrownZone = document.querySelectorAll('.cards-thrown')[config.slot - 1];
            this.lost       = false;
            this.cardsLeft  = 4;
            this.cards      = [];
            this.cardsThrown = [];
        }

        giveBotCards() {
            this.cards = [];
            for (let i = 0; i < 4; i++) {
                this.cards.push(Math.floor(Math.random() * 4));
            }
            updateBotStats();
        }

        clearCardsPlayed() {
            this.cardsThrown = [];
        }

        setTurnIndicator(on) {
            if (on) {
                this.elem.classList.add('is-turn');
            } else {
                this.elem.classList.remove('is-turn');
            }
        }

        // ── AI: pick a card to throw ─────────────────────────
        chooseCard() {
            const cur = state.total;

            // Cards that don't cause immediate bust
            const safeCards = this.cards.filter(c => cur + c <= 9);

            if (safeCards.length === 0) {
                // Forced bust — throw the smallest to minimise the total overflow
                return Math.min(...this.cards);
            }

            if (this.difficulty === 'beginner') {
                return this._chooseBeginner(cur, safeCards);
            } else if (this.difficulty === 'intermediate') {
                return this._chooseIntermediate(cur, safeCards);
            } else {
                return this._chooseExpert(cur, safeCards);
            }
        }

        // Greedy: aggressive when safe, defensive when risky
        _chooseBeginner(cur, safeCards) {
            if (cur <= 6) {
                return Math.max(...safeCards);
            } else {
                return Math.min(...safeCards);
            }
        }

        // Lookahead: prefer cards that push total into the danger zone (7-9)
        // so the next player has fewer safe options
        _chooseIntermediate(cur, safeCards) {
            const trapCards = safeCards.filter(c => cur + c >= 7);
            if (trapCards.length > 0) {
                // Play the card that reaches exactly 9 if possible, else 8, else 7
                for (const target of [9, 8, 7]) {
                    const match = trapCards.find(c => cur + c === target);
                    if (match !== undefined) return match;
                }
                return Math.max(...trapCards);
            }
            // No trap available — play max safe card to build pressure
            return Math.max(...safeCards);
        }

        // Strategic: score each safe card, pick highest, with 10% bluff
        _chooseExpert(cur, safeCards) {
            // 10% chance to bluff (play a random safe card)
            if (Math.random() < 0.1) {
                return safeCards[Math.floor(Math.random() * safeCards.length)];
            }

            let bestCard  = safeCards[0];
            let bestScore = -Infinity;

            for (const card of safeCards) {
                const newTotal = cur + card;
                let score = 0;

                // Reward pushing into danger zone
                if (newTotal === 9) score += 40;
                else if (newTotal === 8) score += 30;
                else if (newTotal === 7) score += 20;
                else if (newTotal >= 5) score += 5;
                else score -= 8;    // low totals give next player many safe plays

                // Extra reward: next player is forced to bust if they have only 3s/2s
                // (heuristic — bigger newTotal = tighter constraint)
                score += newTotal;

                if (score > bestScore) {
                    bestScore = score;
                    bestCard  = card;
                }
            }

            return bestCard;
        }

        // Play the chosen card and update state
        throwCard() {
            if (state.total > 9) return;
            if (this.cards.length === 0) {
                sendLog(`${this.name} is out of cards!`);
                return;
            }

            const chosen = this.chooseCard();
            const idx    = this.cards.indexOf(chosen);
            this.cards.splice(idx, 1);
            this.cardsLeft = Math.max(0, this.cardsLeft - 1);
            this.cardsThrown.push(chosen);

            setTotal(state.total + chosen);
            updateBotStats();

            sendLog(`<span style="color:var(--bot-color)">${this.name} played a <strong>${chosen}</strong></span>`);
            sendLog(`total: ${state.total}`);

            if (state.total > 9) {
                sendLog(`<span style="color:var(--crimson-glow);text-transform:uppercase"><u>${this.name}</u> caused the total to exceed 9 — eliminated.</span>`);
            }
        }
    }

    // ── Create bots ──────────────────────────────────────────
    const bot1 = new Bot(BOT_CONFIG[0]);
    const bot2 = new Bot(BOT_CONFIG[1]);
    const bot3 = new Bot(BOT_CONFIG[2]);
    state.bots = [bot1, bot2, bot3];

    // ── Bot elimination visual ───────────────────────────────
    function eliminateBot(bot) {
        bot.lost = true;
        bot.elem.classList.add('eliminated');
        playSound('./sound/bot-lost.wav');
        sendLog(`<span style="color:var(--gold);font-weight:700">${bot.name} has been eliminated.</span>`);
    }

    // ── Reset round after a bust ─────────────────────────────
    function resetRound() {
        setTotal(0);
        givePlayerCards();
        animateDeal();
        state.playerCardsLeft = 4;
        state.playerWaitTime  = Math.max(2000, state.playerWaitTime - 1200);

        state.bots.forEach(bot => {
            bot.clearCardsPlayed();
            bot.giveBotCards();
            bot.cardsLeft = 4;
        });
        displayEveryCard();
        updateBotStats();
    }

    // ────────────────────────────────────────────────────────
    // ── BOTS' TURN (async, sequential) ───────────────────────
    // ────────────────────────────────────────────────────────
    async function botsTurn() {
        if (state.total > 9 || state.gameOver) return;

        const activeBots = [...state.bots];

        for (const bot of activeBots) {
            if (state.total > 9 || state.gameOver) break;

            // Show whose turn it is
            await showTurnBanner(`${bot.name}'s Turn`);
            await delay(200);

            bot.setTurnIndicator(true);
            await delay(500);

            // Bot plays
            bot.throwCard();
            playSound('./sound/throw.wav');
            await delay(300);

            bot.setTurnIndicator(false);

            if (state.total > 9) {
                screenShake();
                await delay(500);
                eliminateBot(bot);
                // Remove from active bots array
                state.bots = state.bots.filter(b => b !== bot);

                if (state.bots.length === 0) {
                    await delay(600);
                    sendLog('<span style="color:var(--gold);font-weight:700">All opponents eliminated — YOU WIN!</span>');
                    showResult(true);
                    return;
                }

                await delay(400);
                resetRound();
                await delay(700);
                break;     // restart the player's turn
            }

            // Auto-redraw if bot ran out of cards
            if (bot.cardsLeft === 0 && state.total <= 9) {
                bot.clearCardsPlayed();
                bot.giveBotCards();
                bot.cardsLeft = 4;
            }

            await delay(350);
        }

        if (!state.gameOver) {
            await showTurnBanner('Your Turn');
            setPlayerTurn(true);
        }
    }

    // ────────────────────────────────────────────────────────
    // ── PLAYER CARD CLICK ─────────────────────────────────────
    // ────────────────────────────────────────────────────────
    cardsElem.forEach(card => {
        // Hover sound
        card.addEventListener('mouseenter', () => {
            if (!cardContainer.classList.contains('hideCards')) {
                playSound('./sound/card-hover.wav');
            }
        });

        // Click to play
        card.addEventListener('click', async (e) => {
            if (state.clickLocked || state.gameOver) return;
            if (cardContainer.classList.contains('hideCards')) return;
            if (card.style.display === 'none') return;

            state.clickLocked = true;

            const value = parseInt(card.dataset.value);

            // Fly animation before hiding
            await animateCardThrow(card);
            card.style.display = 'none';
            state.playerCardsLeft -= 1;

            // Redraw if out of cards
            if (state.playerCardsLeft <= 0 && state.total <= 9) {
                sendLog('You ran out of cards — new hand dealt.');
                givePlayerCards();
                animateDeal();
                state.playerCardsLeft = 4;
            }

            setTotal(state.total + value);
            playSound('./sound/throw.wav');

            sendLog(`<span style="color:var(--player-color)">You played a <strong>${value}</strong></span>`);
            sendLog(`total: ${state.total}`);

            if (state.total > 9) {
                screenShake();
                sendLog('<span style="color:var(--crimson-glow);text-transform:uppercase">You pushed the total over 9!</span>');
                playSound('./sound/player-lost.wav');
                await delay(600);
                showResult(false);
                return;
            }

            // Hand off to bots
            setPlayerTurn(false);
            await botsTurn();
        });
    });

    // ────────────────────────────────────────────────────────
    // ── UI CONTROLS ───────────────────────────────────────────
    // ────────────────────────────────────────────────────────

    // Reshuffle (one use)
    const reshuffleBtn = document.getElementById('reshuffleBtn');
    let reshuffleUsed  = false;
    reshuffleBtn.addEventListener('click', () => {
        if (reshuffleUsed || !state.isPlayerTurn || state.gameOver) return;
        reshuffleUsed = true;
        givePlayerCards();
        animateDeal();
        state.playerCardsLeft = 4;
        reshuffleBtn.classList.add('used');
        sendLog('You reshuffled your hand.');
    });

    // About button
    const aboutBtn   = document.getElementById('aboutBtn');
    const aboutModal = document.getElementById('aboutModal');
    aboutBtn.addEventListener('click', () => {
        aboutBtn.classList.toggle('active');
    });

    // About Game modal
    const aboutGameBtn = document.querySelector('.about-game');
    aboutGameBtn.addEventListener('click', () => {
        aboutModal.classList.add('active');
        overlay.classList.add('show');
        aboutBtn.classList.remove('active');
    });

    // Bug Report modal
    const bugReportBtn = document.querySelector('.bug-report');
    const bugModal     = document.getElementById('bugModal');
    const nevermindBug = document.getElementById('nevermindBug');

    bugReportBtn.addEventListener('click', () => {
        bugModal.classList.add('active');
        overlay.classList.add('show');
        aboutBtn.classList.remove('active');
    });

    nevermindBug.addEventListener('click', () => {
        bugModal.classList.remove('active');
        overlay.classList.remove('show');
        document.querySelector('textarea[name="report"]').value = '';
    });

    // Close modal on overlay click
    overlay.addEventListener('click', () => {
        if (aboutModal.classList.contains('active')) {
            aboutModal.classList.remove('active');
            overlay.classList.remove('show');
        }
        if (bugModal.classList.contains('active')) {
            bugModal.classList.remove('active');
            overlay.classList.remove('show');
        }
    });

    // Username modal
    const usernameBtn   = document.getElementById('usernameBtn');
    const usernameField = document.getElementById('usernameField');

    function createCookie(name, value) {
        const d   = new Date();
        const dow = ['Mon','Tue','Wed','Thur','Fri','Sat','Sun'];
        document.cookie = `${name}=${value}; expires=${dow[d.getUTCDay()]}, ${d.getUTCDate()} ${d.getUTCFullYear()} 12:00:00 UTC;`;
    }

    usernameBtn.addEventListener('click', () => {
        const val = usernameField.value.trim();
        if (val && !val.includes(' ') && val.length <= 6) {
            playerIndicator.textContent = val;
            createCookie('username', val);
            usernameModal.classList.add('active');
            overlay.classList.remove('show');
            usernameField.classList.remove('error');
        } else {
            usernameField.classList.add('error');
        }
    });

    usernameField.addEventListener('keydown', e => {
        if (e.key === 'Enter') usernameBtn.click();
        usernameField.classList.remove('error');
    });

    // ────────────────────────────────────────────────────────
    // ── BUG REPORT FORM ───────────────────────────────────────
    // ────────────────────────────────────────────────────────
    const bugForm = document.getElementById('bugForm');
    bugForm.addEventListener('submit', ev => {
        ev.preventDefault();
        document.querySelector('.logs').value = logElem.innerText.replace(/\n/g, '<br>');
        const data = new URLSearchParams(new FormData(bugForm));
        fetch('/report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: data,
        });
        bugModal.classList.remove('active');
        overlay.classList.remove('show');
    });

    // ────────────────────────────────────────────────────────
    // ── GAME START ────────────────────────────────────────────
    // ────────────────────────────────────────────────────────
    async function startGame() {
        setTotal(0);
        givePlayerCards();
        bot1.giveBotCards();
        bot2.giveBotCards();
        bot3.giveBotCards();
        updateBotStats();

        setPlayerTurn(false);       // cards hidden until banner clears
        await delay(300);
        animateDeal();
        await showTurnBanner('Your Turn');
        setPlayerTurn(true);
    }

    startGame();

}; // end window.onload

// ── Cheat (console) ───────────────────────────────────────
function iDontLikeThree() {
    document.querySelectorAll('.card').forEach(card => {
        const v    = Math.floor(Math.random() * 3);
        const suit = ['♠','♣','♥','♦'][Math.floor(Math.random() * 4)];
        card.querySelector('.card-value').textContent      = v;
        card.querySelector('.card-suit').textContent       = suit;
        card.querySelector('.card-corner--tl').textContent = `${v}${suit}`;
        card.querySelector('.card-corner--br').textContent = `${v}${suit}`;
        card.dataset.value = v;
    });
    console.log('Cards updated (no 3s).');
}
