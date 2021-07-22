/* 
	By: trinitysenpai
	email : siphesihlebomela@gmail.com
	license : MIT
*/


console.log(" --- * --- --- --- ---");
console.log(
	`Cheat :\niDontLikeThree(); - to change cards to any number less than three `
);

let overlay = document.querySelector(".overlay");
let usernameModal = document.querySelector('.username-modal');
let player = document.querySelector(".player");

// check username in cookie
if (document.cookie) { // if we have cookies
	usernameModal.classList.toggle('active'); //hide the modal
	player.innerHTML = document.cookie.replace('username=', '');
} else {
	overlay.classList.toggle('show'); // toggled for the username
	console.log('we dont have cookies');
}

window.onload = () => {

	let total = document.querySelector(".total");
	let log = document.querySelector(".log");

	// !THE BOT

	//* BOT CLASS START
	class Bot {
		constructor(elem, cardsPlayedElem) {
			// elem property gets the bot elements and the argument acts as the index.
			this.elem = document.querySelectorAll(".bot")[elem - 1]; // -1 so i dont have to work with zero index
			this.cardsPlayedElem = document.querySelectorAll(".cards-thrown")[
				cardsPlayedElem - 1
			]; // gets the span
		}
		lost = false; // will be set to true if the bot's turn result in game over
		cardsLeft = 4; // cards.left - will decrement in each throw
		cards = []; //! the cards the bot got | you dont have to cheat
		cardsThrown = [];
		//? this class method gives the bot 4 random cards (adds them to the [botCards] array)
		giveBotCards() {
			this.cards = []; // empty the array just in case it had cards from the previous round

			for (let c = 0; c < 4; c++) {
				this.cards.push(Math.floor(Math.random() * 4));
			}
			updateBotStats();
		}

		// this class method will throw the least greater card
		throwCard() {
			let thrownCard;

			console.log(this.cards)
			if (!(parseInt(total.innerHTML) > 9)) {
				// if total is not greater
				if (!(this.cards.length === 0 || this.cards == [])) {
					/*if bot is not out of cards*/
					this.cardsLeft = this.cardsLeft - 1; // decrement cardsLeft
					//send to turn to log
					updateBotStats();
					sendLog(`${this.elem.innerHTML}'s turn`);

					//? throwing the card
					if (parseInt(total.innerHTML) <= 6) {
						if (this.cards.includes(3)) { // check for a 3
							console.log('bot has 3')
							//throw the three
							thrownCard = this.cards.sort().pop(); // sort, then get the last one which should be 3						
							this.cardsThrown.push(thrownCard); //add the cards thrown	
							total.innerHTML = parseInt(total.innerHTML) + parseInt(thrownCard); // adding the thrown car to the total
						} else {
							//throw max card
							console.log('bot does not have 3')
							thrownCard = this.cards.sort().pop(); // sort, and get the max card						
							this.cardsThrown.push(thrownCard); //add the cards thrown	
							total.innerHTML = parseInt(total.innerHTML) + parseInt(thrownCard); // adding the thrown car to the total
						}
					} else if (parseInt(total.innerHTML) > 6) {
						//throw minimum card
						thrownCard = this.cards.sort().shift(); // sort and get the min card
						this.cardsThrown.push(thrownCard); //add the cards thrown	
						total.innerHTML = parseInt(total.innerHTML) + parseInt(thrownCard); // adding the thrown card to the total
					}
					console.log(`${this.elem.innerHTML} played a ${thrownCard}!`);

					//send action to log
					sendLog(
						`<span style="color: var(--bot-color);">${this.elem.innerHTML} played a ${thrownCard}!</span>`
					);

					if (parseInt(total.innerHTML) > 9) {
						// if the current bot's throw bought the total to more than nine
						sendLog(
							`<span style="text-transform: uppercase;"><u>${this.elem.innerHTML}</u> bought the total to more than 9</span>`
						);

						sendLog(
							`<span style="text-transform: uppercase;"><u>${this.elem.innerHTML}</u> Has Lost.</span>`
						);

					}
				} else {
					console.warn(`${this.elem.innerHTML} is out of cards!`);
					sendLog(`${this.elem.innerHTML} is out of cards!`);
				}
			}
		}

		clearCardsPlayed() {
			this.cardsThrown = [];
		}

		indicateBotTurn() {
			if (!(parseInt(total.innerHTML) > 9)) {
				// if total is not greater
				this.elem.classList.toggle("is-turn");
			}
			updateBotStats();
		}
	} //* END BOT CLASS

	//? creating the bots
	let bot1 = new Bot(1, 1); // selects the first bot and so on
	let bot2 = new Bot(2, 2);
	let bot3 = new Bot(3, 3); // end

	let bots = [bot1, bot2, bot3]; // array of bots so i can iterate later


	//updating the status that shows how many bot's card are left
	let botStats = document.querySelectorAll(".bot-stats");

	function updateBotStats() {
		let botCardsLeft = [bot1, bot2, bot3];

		for (let i = 0; i < botCardsLeft.length; i++) {
			botStats[i].innerHTML = `Cards Left : ${botCardsLeft[i].cardsLeft}`; // set every stat to the bot's cards left
		}

		for (let i = 0; i < bots.length; i++) {
			for (let j = 0; j < 4; j++) {
				played = bots[i].cardsPlayedElem.children[j];
				played.innerHTML = bots[i].cardsThrown[j];

				//if the element is empty or undefined
				if (isNaN(played.innerHTML)) {
					played.innerHTML = "";
				}
			}
		}
	}


	//! THE PLAYER
	//first goes the player
	let cardsElem = document.querySelectorAll(".card"); //? the player's cards in array
	let playerCardsLeft = 4;
	let playerWaitTime = 6500; // how long the player waits after taking a turn
	//? this function gives gives the player random cards (from one to 3)
	let givePlayerCards = () => {
		cardsElem.forEach((card) => {
			card.innerHTML = Math.floor(Math.random() * 4);
		});
	};


	//function indicates the player's (NOT the bot) turn
	function indicatePlayerTurn() {
		player.classList.toggle("is-turn");
		toggleCards();
	}

	//! adding event listener to every card
	cardsElem.forEach((card) => {
		//when player throws a card
		card.addEventListener("click", (e) => {
			e.target.style.display = "none"; // hide the clicked card
			playerCardsLeft -= 1

			// if player ran out of cards, give four more
			if (playerCardsLeft <= 0 && !(parseInt(total.innerHTML) > 9)) {
				sendLog('player ran out of cards')
				givePlayerCards();
				playerCardsLeft = 4 // reset count, since we now got new cards
				displayEveryCard();
				sendLog('player got new cards')
			}
			// add to total
			total.innerHTML = parseInt(total.innerHTML) + parseInt(e.target.innerHTML);
			playSound('./sound/throw.wav');

			console.log(`You played a ${e.target.innerHTML}`);
			console.log(`total : ${total.innerHTML}`); //keeping track

			//add to log
			//keeping track
			sendLog(
				`<span style="color: var(--player-color);">You played a ${e.target.innerHTML}</span>`
			);
			sendLog(`total : ${total.innerHTML}`);

			if (parseInt(total.innerHTML) > 9) {
				sendLog(
					`<span style="color: var(--player-color); text-transform: uppercase;">You bought the total to more than 9</span>`
				);
				playSound('./sound/player-lost.wav')

				overlay.classList.toggle("show");
				alert("You Lost");
				location.reload(); // reload the page
			} else { //means it is not greater so continue
				// continue the game
				botsTurn(); // the bot's turn
			}
		});
	});

	//* functions that do some stuff
	//? function removes element from array
	let removeElem = (arr, index) => {
		let newArray = [];
		for (i of arr) {
			if (arr[index] == i) {
				// if the element in the array is the one given then do not push it into the [newArray]
				//do nothing
			} else {
				newArray.push(i);
			}
		}
		return newArray; // the array without the passed element.
	};

	//? function hides cards
	let cardContainer = document.querySelector(".cards");
	let toggleCards = () => {
		cardContainer.classList.toggle("hideCards");
		console.log("toggle show cards");
		sendLog("Toggle show cards");
	};

	//? function shows cards after a round, used after giving player new cards
	function displayEveryCard() {
		cardsElem.forEach((card) => {
			//display every card
			card.style.display = "flex";
		});
	}
	//? function store username in cookie
	let d = new Date();
	let dow = ['Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat', 'Sun'];

	function createCookie(cname, value) {
		document.cookie = `${cname} = ${value}; expires=${dow[d.getUTCDay()]}, ${d.getUTCDate()} ${d.getUTCFullYear()} 12:00:00 UTC;` //? COOKIE EXPIRES THE NEXT DAY
	}


	//? after player takes its turn
	function botsTurn() {
		if (!(parseInt(total.innerHTML) > 9)) {
			indicatePlayerTurn(); // no longer player's turn

			let timer = 2000;

			bots.forEach((bot) => {
				if (!(parseInt(total.innerHTML) > 9)) {
					setTimeout(() => {
						bot.indicateBotTurn();

						bot.throwCard(); //throw card.
						playSound('../sound/throw.wav');

						//total
						console.log(`total : ${total.innerHTML}`); //keeping track
						sendLog(`total : ${total.innerHTML}`); //keeping track

						updateBotStats();

						//since setTimeout is async, we throw after
						setTimeout(() => {
							bot.indicateBotTurn(); // hide the indicator, no longer the current bot's turn
						}, 1500);

						if (bot.cardsLeft === 0 && !(parseInt(total.innerHTML) > 9)) {
							// out of cards but no one lost
							bot.clearCardsPlayed();
							bot.giveBotCards();
							bot.cardsLeft = 4; // since we have new cards
						}


						if (parseInt(total.innerHTML) > 9) {
							bot.elem.style.opacity = 0.3; // remove the loser
							// some effect
							if (bot.elem.classList.contains('one')) {
								bot.elem.style.marginLeft = "-4rem"; // remove the loser
							} else if (bot.elem.classList.contains('two')) {
								bot.elem.style.marginTop = "-4rem"; // remove the loser
							} else if (bot.elem.classList.contains('three')) {
								bot.elem.style.marginRight = "-4rem";
							}

							bot.cardsPlayedElem.style.opacity = 0.3;
							playSound('./sound/bot-lost.wav');
							bots = removeElem(bots, bots.indexOf(bot)); //? the bot is out of the game

							//? starting all over without the bot that lost
							total.innerHTML = 0; // reset the total to 0 since someone lost
							givePlayerCards(); // dish out new cards to the player
							playerCardsLeft = 4
							playerWaitTime -= 1500;
							//also dish out new cards for the remaining bots
							bots.forEach((remainingBot) => {
								remainingBot.clearCardsPlayed(); // clear cards
								remainingBot.giveBotCards(); // give cards
								remainingBot.cardsLeft = 4; // since we have new cards
							});
							displayEveryCard(); // cards position to default

						}
					}, timer);

					timer += 1500; //add 2sec to the next iteration
				}
			});

			setTimeout(() => {
				if (bots.length === 0 || bots === []) {
					sendLog("You Won The Game !");
					alert("You Won");
					location.reload(); // reload the page
				}

				if (!(parseInt(total.innerHTML) > 9) && !(bots === [])) {
					indicatePlayerTurn();

				}
			}, playerWaitTime); // set to this variable so we can decrement when a bot loses, to reduce wait time.
		}
	}

	function scrollToBottom(elem) {
		elem.scroll(0, log.scrollHeight); //scroll to the bottom
	}

	function sendLog(message) {
		try {
			log.innerHTML += message + "<br><br>";
			scrollToBottom(log); // to avoid repeatedly invoking the scroll after sending to log
		} catch (error) {
			log.innerHTML += `<span style="color: red;"> ${error} </span>`;
			scrollToBottom(log);
		}
	}

	// About Button (The button with a question mark on the bottom right of the screen)
	let moreButton = document.querySelector('.about');
	moreButton.addEventListener("click", e => {
		moreButton.classList.toggle('active');
	});

	//modals

	//About Modal
	let aboutButton = document.querySelector('.about-game');
	let aboutModal = document.querySelector('.about-modal')
	aboutButton.addEventListener('click', () => {
		aboutModal.classList.toggle('active');
		overlay.classList.toggle("show");
	})

	// hide when click outside modal
	overlay.addEventListener("click", () => {
		if (overlay.classList.contains("show") && aboutModal.classList.contains("active")) {
			aboutModal.classList.remove('active');
			overlay.classList.remove('show');
		}
	});

	//Bug Modal
	let bugReportButton = document.querySelector('.bug-report');
	let bugModal = document.querySelector('.report-bug-modal')
	let nevermindBug = document.querySelector('.nevermind-bug-btn')
	let textarea = document.querySelector('textarea')
	bugReportButton.addEventListener('click', () => {
		bugModal.classList.toggle('active');
		overlay.classList.toggle("show");
	})

	// hide when click outside modal
	overlay.addEventListener("click", () => {
		if (overlay.classList.contains("show") && bugModal.classList.contains("active")) {
			bugModal.classList.remove('active');
			overlay.classList.remove('show');
		}
	});

	//the modal closer
	nevermindBug.addEventListener("click", () => {
		if (overlay.classList.contains("show") && bugModal.classList.contains("active")) {
			bugModal.classList.remove('active');
			overlay.classList.remove('show');
			textarea.value = "" // clear textarea
		}
	});

	// Username Modal & Cookie Feature
	let pickUsername = document.querySelector('.username-btn');
	let usernameInput = document.querySelector('.username-field');

	pickUsername.addEventListener('click', () => {
		if (usernameInput.value && !(usernameInput.value).match(' ')) { // if user entered something, check for whitespaces
			player.innerHTML = usernameInput.value;
			createCookie("username", usernameInput.value); // create a cookie and store the username 
			usernameModal.classList.toggle('active'); //hide the modal
			overlay.classList.toggle('show');
		} else {
			usernameInput.style.border = "solid 2px red"
		}
	})

	// shuffle 
	let shuffleButton = document.querySelector('.reshuffle');
	let shuffleCount = 1;
	shuffleButton.addEventListener('click', () => {
		if (shuffleCount === 1) {
			givePlayerCards();
			shuffleCount -= 1;
			shuffleButton.classList.toggle('used'); // shuffle gone
		}
	})

	// ! GAME SOUND
	let playSound = (file) => {
		let sound = new Howl({
			src: [file],
			rate: 1.3,
			volume: 0.2,
			preload: true
		});

		sound.play();
	}

	//add event listener for hover each card
	cardsElem.forEach(card => {
		card.addEventListener("mouseover", () => {
			if (!(cardContainer.classList.contains('hideCards'))) { //if cards are not hidden
				playSound('../sound/card-hover.wav'); // play card-hover sound
			}
		})
	})

	// Functions END

	//! GAME STARTS HERE
	toggleCards(); // hide cards
	//? dishing out the cards
	givePlayerCards();
	bot1.giveBotCards();
	bot2.giveBotCards();
	bot3.giveBotCards(); // end

	indicatePlayerTurn();
	updateBotStats();
}

//a cheat
function iDontLikeThree() {
	let cards = document.querySelectorAll(".card");

	cards.forEach((card) => {
		card.innerHTML = Math.floor(Math.random() * 3);
	});
}

// ! BUG REPORT FORM

let form = document.querySelector('form');


form.addEventListener('submit', (ev) => {
	ev.preventDefault(); // prevent redirect
	let log = document.querySelector(".log");
	document.querySelector('.logs').value = log.innerText.replace(/\n/g, '<br>'); // remove line breaks
	const data = new URLSearchParams(new FormData(form));
	// send post 
	fetch('/report', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: data
	});
})