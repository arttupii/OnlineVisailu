const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const { error } = require('console');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));
app.use(express.urlencoded({
	extended: true
}));
app.use(express.json());

let games = {
	// Esimerkki pelistä:
	// "123456": {
	//     players: [{ socketId: 'someSocketId', nickname: 'playerName', score: 0, answers: [] }],
	//     started: false,
	//     questions: []
	// }
};

io.on('connection', (socket) => {
	socket.on('createGame', (data, callback) => {
		const gameId = generateGameId();
		games[gameId] = {
			players: [],
			started: false,
			questions: [], // Alusta tyhjänä
			// ... muut peliin liittyvät tiedot ...
		};
		callback(gameId);
		console.log("Create Game, gameId=", gameId);
		socket.join(gameId);
		games[gameId].players.push({ socketId: socket.id, nickname: "", score: -1, admin: true });
	});

	socket.on('joinGame', (data) => {
		const gameId = data.gameId;
		const nickname = data.nickname;

		if (games[gameId] && !games[gameId].started) {
			socket.join(gameId);
			games[gameId].players.push({ socketId: socket.id, nickname: nickname, score: 0 });
			socket.emit('joinedGame', { success: true });

			console.log("Joined to game, socketId: socket.id:%s, nickname:%s", socket.id, nickname);

		} else {
			socket.emit('joinedGame', { success: false, message: 'Peliä ei löydy tai se on jo alkanut!' });

			console.log("Not joined to game [Invalid gameId], socketId: socket.id:%s, nickname:%s", socket.id, nickname);
		}
	});

	socket.on('startGame', (data) => {
		const gameId = data.gameId;
		const seriesName = data.seriesName;

		if (games[gameId]) {
			games[gameId].started = true;

			const allQuestions = JSON.parse(fs.readFileSync('questions.json', 'utf8'));
			const seriesQuestions = allQuestions.find(series => series.name === seriesName).questions;

			games[gameId].questions = seriesQuestions;
			sendQuestion(gameId, seriesQuestions, 0);
		}
	});

	socket.on('answer', (data) => {
		console.log(JSON.stringify(games, " ", 0));
		const game = games[data.gameId];
		if (game) {
			const player = game.players.find(p => p.socketId === socket.id);
			if (player) {
				const currentQuestion = game.questions[game.currentQuestionIndex];

				console.log(data);

				if (data.option === currentQuestion.correctAnswer) {
					player.score += 1;
					io.to(socket.id).emit('scoreUpdated', {score: player.score})
				}
				console.log("Player score, nickname:%, score:%s", player.nickname, player.score);
				//player.answers.push(data.option);
			}
		}
	});
});

function sendQuestion(gameId, seriesQuestions, questionIndex) {
	if (seriesQuestions[questionIndex]) {
		const currentQuestion = seriesQuestions[questionIndex];

		games[gameId].currentQuestionIndex = questionIndex;  // Tallenna nykyinen kysymysindeksi

		// Lähetä kysymys pelaajille
		io.in(gameId).emit('newQuestion', currentQuestion);

		setTimeout(() => {
			sendQuestion(gameId, seriesQuestions, questionIndex + 1);
		}, currentQuestion.duration * 1000);
	} else {
		endGame(gameId);  // Kutsutaan endGame-funktiota, kun kaikki kysymykset on esitetty
	}
}

// Kun peli päättyy...
function endGame(gameId) {
	const game = games[gameId]
	if (game) {
		const scoreboard = game.players.filter(player => player.score != -1)

		io.to(gameId).emit('gameOver', scoreboard)
	}
}

app.get('/admin', (req, res) => {
	res.sendFile(__dirname + '/public/admin.html');
});

app.get('/admin_addQuestions', (req, res) => {
	res.sendFile(__dirname + '/public/admin_addQuestion.html');
})

// Päätepiste uuden kysymyksen lisäämiselle.
app.post('/addQuestion', (req, res) => {
	// Poimii kysymyksen objektin pyynnön rungosta
	const forValidation = req.body;

	// Poimii kysymyksen kategorian
	const newQuestionCategory = req.body.category;

	// Tarkistaa syötteiden kelvollisuuden ja tallentaa kysymysobjektin muuttujaan
	const newQuestion = validateInput(forValidation);

	// Jos kysymys on virheellinen, lähettää virheen selaimelle
	if (newQuestion.error) {
		res.status(400).json({ success: false, message: newQuestion.error });
		return;
	}

	// Lukee kysymystiedoston uuden kysymyksen lisäämistä varten
	fs.readFile('questions.json', 'utf8', (err, data) => {
		if (err) {
			console.error('\nVirhe lukiessa tiedostoa: ', err);
			res.status(500).send("Virhe lukiessa kysymystiedostoa");
			return;
		}

		// Jäsentää luetun tiedon JavaScript-objektiksi
		let allQuestions;
		try {
			allQuestions = JSON.parse(data);
		} catch (parseError) {
			console.error("\nVirhe jäsennettäessä tiedostoa: ", parseError);
			res.status(500).send("Virhe jäsennettäessä tiedostoa");
			return;
		}

		// Etsii kysymyksen kategorian sijainnin taulukosta
		let categoryIndex = allQuestions.findIndex(category => category.name === newQuestionCategory);

		if (categoryIndex === -1) {
			newCategory = {
				name: newQuestionCategory,
				questions: []
			}

			allQuestions.push(newCategory);
			categoryIndex = allQuestions.findIndex(category => category.name === newQuestionCategory);
		}

		// Luo kysymykselle id-arvon perustuen kysymyksen kategorian viimeisimmän kysymyksen id-arvoon
		const newId = allQuestions[categoryIndex].questions.length + 1;
		newQuestion.id = newId;

		allQuestions[categoryIndex].questions.push(newQuestion);

		// Kirjoittaa päivitetyn kysymysobjektin takaisin tiedostoon
		fs.writeFile('questions.json', JSON.stringify(allQuestions, null, 2), (err) => {
			if (err) {
				console.error("\nKysymystä ei voitu lisätä tiedostoon");
				res.status(500).send("Virhe kirjoittaessa tiedostoon");
			} else {
				console.log("\nKysymys lisätty tiedostoon");
				res.status(201).json({ success: true, message: "Kysymys lisätty onnistuneesti!" });
			}
		})
	})
})

app.get('/questions', (req, res) => {
	fs.readFile('questions.json', 'utf8', (err, data) => {
		if (err) {
			res.status(500).send('Error reading questions');
			return;
		}
		res.json(JSON.parse(data));
	});
});
app.get('/player', (req, res) => {
	res.sendFile(__dirname + '/public/player.html');
});
app.post('/getUsers', (req, res) => {
	console.log("Pyyntö saatu.");
	console.log(req.body);
	res.send(games[req.body.gameId].players);
	console.log(games);
	console.log(req.body.gameId);
});
app.get('/', (req, res) => {
	res.send('Kahoot-tyylinen peli Node.js:llä!');
});

server.listen(3000, () => {
	console.log('Server listening on port 3000');
});

function generateGameId() {
	// Yksinkertainen esimerkki: satunnainen 4-numeroinen koodi. Voit laajentaa tätä tarpeen mukaan.
	return Math.floor(1000 + Math.random() * 9000).toString();
}

// Tarkistaa, että kysymyksen syötteet ovat kelvollisia.
// Palauttaa virhekuvauksen jos jokin syöte on viallinen.
// Muuten palauttaa kysymyksen objektina jatkotoimenpiteitä varten.
function validateInput(input) {
	// Tarkistaa, että kaikki pakolliset kentät ovat täytetty
	if (!input.question || !input.options || !input.correctAnswer || !input.duration) {
		return { error: "Kaikki pakolliset kentät on täytettävä!" };
	}

	// Tarkistaa, että annettu oikea vastaus löytyy annetuista vastausvaihtoehdoista
	if (!input.options.includes(input.correctAnswer)) {
		return { error: "Annettua oikeaa vastausta ei löydy vastausvaihtoehdoista!" };
	}

	// Tarkistaa, että vastausvaihtoehtoja on vähintään kaksi
	if (input.options.length < 2) {
		return { error : "Vastausvaihtoehtoja pitää olla vähintään kaksi!" };
	}

	// Tarkistaa, ettei vastausvaihtoehtoja ole kaksi samaa
	const uniqueOptions = new Set(input.options);
	if (uniqueOptions.size !== input.options.length) {
		return { error: "Vastausvaihtoehtoja ei voi olla kaksi samaa!" }
	}

	// Tarkistaa, että aikaraja vastaamiseen ei ole negatiivinen
	if (parseInt(input.duration, 10) < 0) {
		return { error: "Aikaraja vastaamiseen ei voi olla negatiivinen!" };
	}

	// Mikäli kysymys läpäisee tarkastuksen, lähettää kysymyksen objektina
	return { 
		id: '',
		question: input.question,
		options: input.options,
		correctAnswer: input.correctAnswer,
		duration: input.duration
	};
}