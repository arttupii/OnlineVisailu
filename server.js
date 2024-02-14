const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');

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

	/*socket.on('startGame', (data) => {
		const gameId = data.gameId;
		const seriesName = data.seriesName;

		if (games[gameId]) {
			games[gameId].started = true;
			
			const allQuestions = JSON.parse(fs.readFileSync('questions.json', 'utf8'));
			const seriesQuestions = allQuestions.find(series => series.name === seriesName).questions;

			sendQuestion(gameId, seriesQuestions, 0);
		}
	});*/

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
	const game = games[gameId];
	if (game) {
		game.players.forEach(player => {
			if (player.score === -1) {
				//admin tai pelin luoja

				io.to(player.socketId).emit('gameOver', game.players.filter(function (p) {
					return p.score > -1;
				}).map(function (p) {
					return { nickname: p.nickname, score: p.score };
				}));
			} else {
				//pelaajalle omat pisteet
				io.to(player.socketId).emit('gameOver', [{ nickname: player.nickname, score: player.score }]);
			}
		});
	}
}

app.get('/admin', (req, res) => {
	res.sendFile(__dirname + '/public/admin.html');
});

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