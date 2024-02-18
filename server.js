const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs').promises;

class VisailuServer {
	constructor() {
		console.clear();
		this.app = express();
		this.server = http.createServer(this.app);
		this.io = socketIo(this.server);
		this.games = {};

		this.setupMiddleware();
		this.setupSocketIO();
		this.setupRoutes();
		this.server.listen(3000, () => console.log('Palvelin käynnistetty porttiin 3000'));
	}

	setupMiddleware() {
		this.app.use(express.static('public'));
		this.app.use(express.urlencoded({ extended: true }));
		this.app.use(express.json());
	}

	setupSocketIO() {
		this.io.on('connection', (socket) => {
			socket.on('createGame', async (data, callback) => {
				this.createGame(socket, data, callback);
			});

			socket.on('joinGame', (data) => {
				this.joinGame(socket, data);
			});

			socket.on('startGame', async (data) => {
				this.startGame(socket, data);
			});

			socket.on('answer', (data) => {
				this.answer(socket, data);
			});
		});
	}

	setupRoutes() {
		this.app.get('/', (req, res) => res.send('Node.js-based Quiz Game!'));
		this.app.get('/admin', (req, res) => res.sendFile(__dirname + '/public/admin.html'));
		this.app.get('/questions', async (req, res) => this.getQuestions(req, res));
		this.app.get('/player', (req, res) => res.sendFile(__dirname + '/public/player.html'));
		this.app.post('/getUsers', (req, res) => this.getUsers(req, res));
		this.app.post('/getWinner', (req, res) => this.getWinner(req, res));
		this.app.get('/static/bootstrap.min.js', (req, res) => res.sendFile(__dirname + '/node_modules/bootstrap/dist/js/bootstrap.bundle.min.js'));
		this.app.get('/static/bootstrap.min.css', (req, res) => res.sendFile(__dirname + '/node_modules/bootstrap/dist/css/bootstrap.min.css'));
		this.app.get('/static/main.css', (req, res) => res.sendFile(__dirname + '/src/static/main.css'));
	}

	async createGame(socket, data, callback) {
		const gameId = this.generateGameId();
		this.games[gameId] = { players: [], started: false, questions: [] };
		callback(gameId);
		socket.join(gameId);
		this.games[gameId].players.push(this.createPlayer(socket.id, true));
	}

	joinGame(socket, data) {
		const { gameId, nickname } = data;
		if (this.games[gameId] && !this.games[gameId].started) {
			socket.join(gameId);
			this.games[gameId].players.push(this.createPlayer(socket.id, false, nickname));
			socket.emit('joinedGame', { success: true });
		} else {
			socket.emit('joinedGame', { success: false, message: 'Game not found or already started!' });
		}
	}

	async startGame(socket, data) {
		const { gameId, seriesName } = data;
		if (this.games[gameId]) {
			this.games[gameId].started = true;
			const allQuestions = await this.readQuestions();
			const seriesQuestions = allQuestions.find(series => series.name === seriesName).questions;
			this.games[gameId].questions = seriesQuestions;
			this.sendQuestion(gameId, seriesQuestions, 0);
		}
	}

	answer(socket, data) {
		const game = this.games[data.gameId];
		if (game) {
			const player = game.players.find(p => p.socketId === socket.id);
			if (player) {
				const currentQuestion = game.questions[game.currentQuestionIndex];
				player.score += data.option === currentQuestion.correctAnswer ? 1 : 0;
			}
		}
	}

	async readQuestions() {
		try {
			const data = await fs.readFile('questions.json', 'utf8');
			return JSON.parse(data);
		} catch (err) {
			console.error('Error reading questions:', err);
			return [];
		}
	}

	sendQuestion(gameId, seriesQuestions, questionIndex) {
		if (seriesQuestions[questionIndex]) {
			const currentQuestion = seriesQuestions[questionIndex];
			this.games[gameId].currentQuestionIndex = questionIndex;
			this.io.in(gameId).emit('newQuestion', currentQuestion);
			setTimeout(() => this.sendQuestion(gameId, seriesQuestions, questionIndex + 1), currentQuestion.duration * 1000);
		} else {
			this.endGame(gameId);
		}
	}

	endGame(gameId) {
		const game = this.games[gameId];
		if (game) {
			game.players.forEach(player => {
				const payload = player.admin ?
					game.players.filter(p => p.score >= 0).map(p => ({ nickname: p.nickname, score: p.score })) :
					{ score: player.score };
				this.io.to(player.socketId).emit('gameOver', payload);
			});
		}
	}

	createPlayer(socketId, isAdmin, nickname = '') {
		return { socketId, nickname, score: isAdmin ? -1 : 0, admin: isAdmin };
	}

	async getQuestions(req, res) {
		try {
			const data = await this.readQuestions();
			res.json(data);
		} catch (err) {
			res.status(500).send('Error reading questions');
		}
	}

	async getUsers(req, res) {
		const gameId = req.body.gameId;
		if (this.games[gameId]) {
			res.send(this.games[gameId].players);
		} else {
			res.status(404).send('Game not found');
		}
	}

	async getWinner(req, res) {
		const gameId = req.body.gameId;
		if (this.games[gameId]) {
			const winner = this.games[gameId].players.reduce((prev, current) => (prev.score > current.score) ? prev : current);
			res.send({
				"success": true,
				"winner": winner["nickname"],
			});
		} else {
			res.status(404).send({
				"success": false,
				"message": "Game not found!"
			});
		}
	}

	generateGameId() {
		return Math.floor(1000 + Math.random() * 9000).toString();
	}
}

new VisailuServer();