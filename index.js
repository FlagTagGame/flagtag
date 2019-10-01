const express = require('express');
const app = express();
const path = require('path');
const _ = require('lodash');
const http = require('http');
const socketIO = require('socket.io');

// Game Component
const Game = require('./components/Game');

// Classic Map
const classicMapJSON = require('./maps/Classic.json');
// EMERALD
const EMERALDJSON = require('./maps/EMERALD.json');

const PORT = process.env.PORT || 8080;
const isDev = process.env.PORT ? false : true;

// Initialize HTTP server using express app
const httpServer = http.Server(app);

// Initalize the socket.io server
const io = socketIO(httpServer, {
	perMessageDeflate: {
		threshold: 32768,
		serverNoContextTakeover: false /* Enables sliding window during zlib compression */
	}
});

let ioHome = io.of("/home");
let ioGame = io.of("/game");

// An array of games will be used instead later.
let games = [];

// If in development mode then use the source js
if(isDev) {
	app.use('/js', express.static(path.join(__dirname, 'src/js')));
}
// If not in dev mode, '/js' will be directed to the public obfuscated js

// Home Page
app.get('/', function(req, res){
	res.sendFile(__dirname + '/public/index.html');
});

// Game Page
app.get('/game', function(req, res){
	res.sendFile(__dirname + '/public/game.html');
});

// Makes all files inside the public folder availible
app.use('/', express.static(path.join(__dirname, 'public')));

// Home connection handler
ioHome.on('connection', socket => {
	socket.on('create game', (gameName, callback) => {
		// Check if game name and a callback has been provided
		if(typeof gameName === "string" && typeof callback === "function") {
			let game = new Game({name: gameName || "Some Game " + (games.length + 1), mapData: EMERALDJSON, io: ioGame});

			games.push(game);

			callback(game.id);
		}
	});

	socket.on('list games', (callback) => {
		// Check if game name and a callback has been provided
		if(typeof callback === "function") {
			callback(games.map(a => a.sendable()));
		}
	});
});

// In-Game connection handler
ioGame.on('connection', socket => {
	let player = null;

	socket.on('join game', ({gameID, playerSettings}, callback) => {
		// Check if player isn't in a game & if a callback has been provided
		if(!player && typeof gameID === "string" && typeof callback === "function") {
			let game = games.find(a => a.id === gameID);
			if(!game) return;

			// Let the player join the main game.
			let data = game.joinGame(socket, playerSettings);
			// Set the player variable so we know that the player is logged in now.
			player = data.player;
			
			// Sending back:
			// Player's ID: So the client knows there own player
			// Map Data: So the player can build out the map graphics when they join
			// Settings: The shared server and client settings object
			callback(data.starterData);
		}
	});

	socket.on('input', input => {
		// Check if player object exists and the input object exists
		if(player && typeof input === "object") {
			// Let the Player class handle input
			player.handleInput(input);
		}
	});

	socket.on('disconnect', () => {
		if(player) {
			let game = games.find(a => a.id === player.game.id);
			if(!game) return;

			game.removePlayer(player);
		}
	});
});

setInterval(() => {
	for (let i = games.length - 1; i >= 0; i--) {
		if(games[i].stopped) games.splice(i, 1);
	}
}, 5000);

httpServer.listen(PORT, function(){
	console.log('listening on *:' + PORT);
});