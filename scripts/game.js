/* 
	By: trinitysenpai
	email : siphesihlebomela@gmail.com
	license : MIT

*/
console.log(" --- * --- --- --- ---");
let total = document.querySelector(".counter");
let log = document.querySelector('.log');
let overlay = document.querySelector('.overlay');


// !THE BOT
class Bot {
	constructor(elem) {
		// elem property gets the bot elements and the argument acts as the index.
		this.elem = document.querySelectorAll(".bot")[elem - 1]; // -1 so i dont have to work with zero index
	}
	lost = false; // will be set to true if the bot's turn result in game over
	cardsLeft = 4; // cards.left - will decrement in each throw
	cards = []; //! the cards the bot got | you dont have to cheat
	
	//? this class method gives the bot 4 random cards (adds them to the [botCards] array)
	giveBotCards() {
		this.cards = []; // empty the array just in case it had cards from the previous round
		
		for (let c = 0; c < 4; c++) {
			this.cards.push(Math.floor(Math.random() * 4));
		}
		updateStatus();	

	}

	// this class method will throw the least greater card
	throwCard() {
		if(!(parseInt(total.innerHTML) > 9)){ // if total is not greater
			if (!(this.cards.length === 0 || this.cards == [])) { /*if bot is not out of cards*/ 
				this.cardsLeft = this.cardsLeft - 1; // decrement cardsLeft
				updateStatus();
				//send to turn to log
				sendLog(`${this.elem.innerHTML}'s turn`);	
				scrollToBottom(log);
				
				//? throwing the card
				let thrownCard = this.cards.sort().shift(); // the card thrown by the bot
				console.log(`${this.elem.innerHTML} played a ${thrownCard}!`);
				total.innerHTML = parseInt(total.innerHTML) + parseInt(thrownCard); // adding the thrown car to the total
			
				//send action to log
				sendLog(`<span style="color: var(--bot-color);">${this.elem.innerHTML} played a ${thrownCard}!</span>`);
				scrollToBottom(log);

				if(parseInt(total.innerHTML) > 9){ // if the current bot's throw bought the total to more than nine
					sendLog(`<span style="text-transform: uppercase;"><u>${this.elem.innerHTML}</u> bought the total to more than 9</span>`)
					scrollToBottom(log);
					console.log('game stopped')
				}				
			} else {
				updateStatus();
				console.warn(`${this.elem.innerHTML} is out of cards!`);
				sendLog(`${this.elem.innerHTML} is out of cards!`);
				scrollToBottom(log);
			}
		}
	}
	
	indicateBotTurn() {
		if(!(parseInt(total.innerHTML) > 9)){ // if total is not greater
			this.elem.classList.toggle('is-turn');
		}
	}
} 

//? creating the bots
let bot1 = new Bot(1); // selects the first bot and so on
let bot2 = new Bot(2);
let bot3 = new Bot(3); // end

let bots = [bot1, bot2, bot3]; // array of bots so i can iterate later

//* END BOT CLASS

//! THE PLAYER
//first goes the player
let cardsElem = document.querySelectorAll(".card"); //? the player's cards in array
let player = document.querySelector(".player");
let playerCards = [];
let comps = ["card-one", "card-two", "card-three", "card-four"]; //for finding the card

//? this function gives gives the player random cards (from one to 3)
let givePlayerCards = () => {	
	cardsElem.forEach((card) => {
			card.innerHTML = Math.floor(Math.random() * 4);
	});
};

//idk why we are doing this but without it, this code dies...
//adding the cards into the player cards array, will be used to check how many cards player has.
function updatePlayerCardsLeft(){
	playerCards = []; //empty the array

	cardsElem.forEach((card) => {
		playerCards.push(card);
	});
}

updatePlayerCardsLeft();

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
		playerCards = removeElem(playerCards, comps.indexOf(e.target.classList[1])); //remove the thrown card in the array
		comps = removeElem(comps, comps.indexOf(e.target.classList[1])); //also remove the thrown card bay array

		// add to total
		total.innerHTML = parseInt(total.innerHTML) + parseInt(e.target.innerHTML);

		console.log(`You played a ${e.target.innerHTML}`);
		console.log(`total : ${total.innerHTML}`); //keeping track

		//add to log 
		//keeping track
		sendLog(`<span style="color: var(--player-color);">You played a ${e.target.innerHTML}</span>`);
		sendLog(`total : ${total.innerHTML}`);
		scrollToBottom(log);


		if (playerCards === [] || playerCards.length === 0) {
			console.warn("Player played all cards");
			sendLog("Player played all cards <br>")
			scrollToBottom(log);
		}

		if (parseInt(total.innerHTML) > 9){
			sendLog(`<span style="color: var(--player-color); text-transform: uppercase;">You bought the total to more than 9</span>`);
			overlay.classList.toggle('show')
			scrollToBottom(log)
		} else{ // continue the game
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
let toggleCards = () => {
	let cardContainer = document.querySelector(".cards");
	cardContainer.classList.toggle("hideCards");
	console.log("toggle show cards");
	sendLog("Toggle show cards<br>")
	scrollToBottom(log);
};

//? after player takes its turn
async function botsTurn() {
if(parseInt(total.innerHTML) < 10){
	
	indicatePlayerTurn(); // no longer player's turn 

	let timer = 2000;

		bots.forEach(bot => {

		if (!(parseInt(total.innerHTML) > 9)){
		
				setTimeout(() => {

					bot.indicateBotTurn();

					bot.throwCard(); //throw card.
					
					updateStatus();
				
						//since setTimeout is async, we throw after
						setTimeout(() => {
							bot.indicateBotTurn(); // hide the indicator, no longer the current bot's turn
						}, 1500);

					if (parseInt(total.innerHTML) > 9){
						bot.elem.style.opacity = 0.3; // remove the loser
						bot.elem.style.marginTop = "-3rem"; // remove the loser
						sendLog(`${bot.elem.textContent} has lost.`)
						bots = removeElem(bots, bots.indexOf(bot)); //? the bot is out of the game

						//? starting all over without the bot that lost
						total.innerHTML = 0; // reset the total to 0 since someone lost 
						givePlayerCards(); // dish out new cards to the player
						updatePlayerCardsLeft();// update player cards
						updateStatus(); // also need to update status here
						//also dish out new cards for the remaining bots
						bots.forEach(remainingBot => {
							remainingBot.giveBotCards(); // give cards
							remainingBot.cardsLeft = 4;// since we have new cards
						});

							cardsElem.forEach(card => { //display every card
							card.style.display = "flex";
						});
					}
			}, timer);
		
		timer += 1500; //add 2sec to the next iteration
	}
});

	setTimeout(() => {
		if (bots.length === 0 || bots === []){
			sendLog('You Won The Game !');
			scrollToBottom(log);
			alert('You Won');
		}

		if (!(parseInt(total.innerHTML) > 9 && !(bots === []))){
			indicatePlayerTurn();
		}
	}, 6500);
}
}

function scrollToBottom(elem) {
	elem.scroll(0, log.scrollHeight); //scroll to the bottom
}

function sendLog(message){
	try {
		log.innerHTML += (message + "<br>");		
	} catch (error) {
		log.innerHTML += `<span style="color: red;"> ${error} </span>`
	}
}

//updating the status that shows how many bot's card are left
let botStats = document.querySelectorAll('.bot-status');
function updateStatus() {
	let botCardsLeft = [bot1, bot2, bot3]
	
	for(let i = 0; i < botCardsLeft.length; i++){
		botStats[i].innerHTML = botCardsLeft[i].cardsLeft; // set every stat to the bot's cards left
	}
}
// Functions END

//! GAME STARTS HERE
toggleCards(); // hide cards

//? dishing out the cards
givePlayerCards();
bot1.giveBotCards();
bot2.giveBotCards();
bot3.giveBotCards(); // end

indicatePlayerTurn();
updateStatus();