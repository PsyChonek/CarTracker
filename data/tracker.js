if (!!window.EventSource) {
	console.log("Start event source!");
	var source = new EventSource("/events");

	// Add reconnection logic when an error occurs
	source.onerror = function (e) {
		console.error("EventSource failed: ", e);
		if (e.target.readyState === EventSource.CLOSED) {
			console.log("Reconnecting to EventSource...");
			// Try reconnecting after 5 seconds
			setTimeout(() => {
				source = new EventSource("/events");
				addEventListeners(source);
			}, 5000);
		}
	};
}

function addEventListeners(source) {
	source.addEventListener(
		"newReadings",
		function (e) {
			console.log("newReadings ", e.data);
			newReading(JSON.parse(e.data));
		},
		false
	);

	source.addEventListener(
		"open",
		function (e) {
			console.log("Events Connected");
		},
		false
	);

	source.addEventListener(
		"error",
		function (e) {
			if (e.target.readyState != EventSource.OPEN) {
				console.log("Events Disconnected");
			}
		},
		false
	);

	source.addEventListener(
		"message",
		function (e) {
			console.log("message", e.data);
		},
		false
	);
}

// Initialize event listeners
addEventListeners(source);

var playerOne = [];
var playerTwo = [];
var readings = [];
var timerInterval;
var startTime;
var elapsedTime = 0;
var ignoreAfterStartDelay;
var players = 2;

// Timer Logic
function startTimer() {
	resetTimer();

	startTime = Date.now() - elapsedTime;
	timerInterval = setInterval(() => {
		elapsedTime = Date.now() - startTime;
		document.getElementById("timer").textContent = timeToString(elapsedTime);
		// Check if over
		checkEndGame();
	}, 10); // Update every 10 milliseconds to show ms
	document.getElementById("startButton").disabled = true;
	document.getElementById("stopButton").disabled = false;
}

function stopTimer() {
	clearInterval(timerInterval);
	document.getElementById("stopButton").disabled = true;
	document.getElementById("startButton").disabled = false;
}

var countdownInterval;

// Function to start the F1 light-style delayed timer
function startDelayedTimer() {
	let countdownValue = 5;
	let lights = [document.getElementById("light1"), document.getElementById("light2"), document.getElementById("light3"), document.getElementById("light4"), document.getElementById("light5")];

	// Reset all lights to dimmed state
	lights.forEach((light) => light.classList.remove("on"));

	// Display the F1-themed modal
	document.getElementById("countdownModal").style.display = "flex";

	// Start countdown
	countdownInterval = setInterval(() => {
		// Light up the current light based on the countdown value
		if (countdownValue > 0) {
			lights[5 - countdownValue].classList.add("on");
		}

		countdownValue--;

		// Once countdown reaches 0, turn off all lights
		if (countdownValue < 0) {
			clearInterval(countdownInterval);
			document.getElementById("countdownModal").style.display = "none";
			startTimer(); // Start the actual timer
		}
	}, 1000);
}

// Convert time to HH:MM:SS.mmm format
function timeToString(time) {
	let diffInHrs = time / 3600000;
	let hh = Math.floor(diffInHrs);

	let diffInMin = (diffInHrs - hh) * 60;
	let mm = Math.floor(diffInMin);

	let diffInSec = (diffInMin - mm) * 60;
	let ss = Math.floor(diffInSec);

	let diffInMs = time % 1000;
	let ms = diffInMs.toString().padStart(3, "0");

	let formattedHH = hh.toString().padStart(2, "0");
	let formattedMM = mm.toString().padStart(2, "0");
	let formattedSS = ss.toString().padStart(2, "0");

	return `${formattedHH}:${formattedMM}:${formattedSS}.${ms}`;
}

// Show winner modal
function showWinnerModal(winner) {
	document.getElementById("winnerModal").style.display = "flex";
	document.getElementById("winnerText").textContent = winner;
}

// Check for end of game
var checkEndGame = function () {
	// Get the selected radio button value for "mode"
	var selectedMode = document.querySelector('input[name="mode"]:checked').value;
	if (selectedMode == "time") {
		var seconds = document.getElementById("timeLimitSeconds").value;
		var minutes = document.getElementById("timeLimitMinutes").value;

		if (elapsedTime >= (minutes * 60 + seconds) * 1000) {
			stopTimer();

			let playerOneFastest = Number.MAX_VALUE; // Declare the variable before the logic
			let playerTwoFastest = Number.MAX_VALUE; // Declare the variable before the logic

			// Calculate fastest lap for player one
			if (playerOne.length > 1) {
				for (let i = 1; i < playerOne.length; i++) {
					let lapTime = playerOne[i] - playerOne[i - 1]; // Time between consecutive laps
					if (lapTime < playerOneFastest) {
						playerOneFastest = lapTime;
					}
				}
			}

			// Calculate fastest lap for player two
			if (playerTwo.length > 1) {
				for (let i = 1; i < playerTwo.length; i++) {
					let lapTime = playerTwo[i] - playerTwo[i - 1]; // Time between consecutive laps
					if (lapTime < playerTwoFastest) {
						playerTwoFastest = lapTime;
					}
				}
			}

			// Determine the winner
			if (playerOneFastest < playerTwoFastest) {
				showWinnerModal("Player 1 - Fastest Lap: " + timeToString(playerOneFastest));
			} else if (playerTwoFastest < playerOneFastest) {
				showWinnerModal("Player 2 - Fastest Lap: " + timeToString(playerTwoFastest));
			} else {
				showWinnerModal("Tie - Fastest Lap: " + timeToString(playerOneFastest));
			}
		}
	}

	if (selectedMode == "laps") {
		var laps = document.getElementById("lapsLimit").value;

		if (playerOne.length >= laps && playerTwo.length >= laps) {
			stopTimer();
			showWinnerModal("Tie");
		}

		if (playerOne.length >= laps) {
			stopTimer();
			showWinnerModal("Player 1");
		}

		if (playerTwo.length >= laps) {
			stopTimer();
			showWinnerModal("Player 2");
		}
	}
};

var coolDownPlayerOne = 0;
var coolDownPlayerTwo = 0;

// Handle new reading
var newReading = function (data) {
	ignoreAfterStartDelay = document.getElementById("ignoreAfterStartDelay").value;

	// Ignore readings for the first seconds after start
	if (Date.now() - startTime < ignoreAfterStartDelay) {
		return;
	}

	console.log(data);

	// Check for inputPin1 and inputPin2, update corresponding tables
	if (data.inputPin1 || (data.inputPin2 && players == 1)) {
		var time = Date.now() - startTime;

		if (isNaN(time)) {
			alert("Timer is not running");
			return;
		}

		// Only if time is more that 500ms
		if (Date.now() - coolDownPlayerOne > 500) {
			playerOne.push(time);
			readings.push(data);
			coolDownPlayerOne = Date.now();
			addToTable("timeTableOne", playerOne.length, time);
		}
	}

	if (data.inputPin2 && players == 2) {
		var time = Date.now() - startTime;

		if (isNaN(time)) {
			alert("Timer is not running");
			return;
		}

		// Only if time is more that 500ms
		if (Date.now() - coolDownPlayerTwo > 500) {
			playerTwo.push(time);
			readings.push(data);
			coolDownPlayerTwo = Date.now();
			addToTable("timeTableTwo", playerTwo.length, time);
		}
	}
};

// Function to add data to the specific table
function addToTable(tableId, round, time) {
	let table = document.getElementById(tableId);
	let row = table.insertRow();
	let cellRound = row.insertCell(0);
	let cellTime = row.insertCell(1);
	let cellTimeDiff = row.insertCell(2);

	cellRound.textContent = round;
	cellTime.textContent = timeToString(time);
	if (round > 1) {
		if (tableId == "timeTableOne") {
			cellTimeDiff.textContent = timeToString(playerOne[playerOne.length - 1] - playerOne[playerOne.length - 2]);
		} else {
			cellTimeDiff.textContent = timeToString(playerTwo[playerTwo.length - 1] - playerTwo[playerTwo.length - 2]);
		}
	} else {
		cellTimeDiff.textContent = timeToString(time);
	}
}

// Clear table rows except headers
function clearTable(table) {
	while (table.rows.length > 1) {
		table.deleteRow(1);
	}
}

// Reset Timer and Tables
function resetTimer() {
	clearInterval(timerInterval);
	elapsedTime = 0;
	document.getElementById("timer").textContent = "00:00:00.000";

	// Clear both tables
	clearTable(document.getElementById("timeTableOne"));
	clearTable(document.getElementById("timeTableTwo"));

	document.getElementById("startButton").disabled = false;
	document.getElementById("stopButton").disabled = true;

	playerOne = [];
	playerTwo = [];

	readings = [];
}

// Button initial states
document.getElementById("startButton").disabled = false;
document.getElementById("stopButton").disabled = true;

//Click anywhere to close winner modal
document.getElementById("winnerModal").addEventListener("click", function () {
	document.getElementById("winnerModal").style.display = "none";
});

document.getElementById("players").addEventListener("change", function () {
	const selectedPlayer = document.querySelector('input[name="players"]:checked').value;
	if (selectedPlayer === "1") {
		document.getElementById("timeTableOne").style.display = "table";
		document.getElementById("timeTableTwo").style.display = "none";
		players = 1;
	} else {
		document.getElementById("timeTableOne").style.display = "table";
		document.getElementById("timeTableTwo").style.display = "table";
		players = 2;
	}
});
