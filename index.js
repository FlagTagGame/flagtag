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

const PORT = process.env.PORT || 8080;
const isDev = process.env.PORT ? false : true;

// Initialize HTTP server using express app
const httpServer = http.Server(app);

// Initalize the socket.io server
const io = socketIO.listen(httpServer);

let ioGame = io.of("/game");

// Create the main game instance
// An array of games will be used instead later.
let mainGame = new Game({mapData: classicMapJSON, io: ioGame});

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

// In-Game connection handler
ioGame.on('connection', socket => {
	let player = null;

	socket.on('join game', callback => {
		// Check if player isn't in a game & if a callback has been provided
		if(!player && typeof callback === "function") {
			// Let the player join the main game.
			let data = mainGame.joinGame(socket);
			// Set the player variable so we know that the player is logged in now.
			player = data.player;

			// Sending back:
			// Player's ID: So the client knows there own player
			// Map Data: So the player can build out the map graphics when they join
			// Settings: The shared server and client settings object
			callback(player.id, data.map, data.SETTINGS);
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
			mainGame.removePlayer(player);
		}
	});
});

httpServer.listen(PORT, function(){
	console.log('listening on *:' + PORT);
});