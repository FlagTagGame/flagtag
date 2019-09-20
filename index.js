const express = require('express');
const app = express();
const path = require('path');
const _ = require('lodash');
const http = require('http');
const socketIO = require('socket.io');

const Game = require('./components/Game');

const classicMapJSON = require('./maps/Classic.json');

const PORT = process.env.PORT || 8080;
const isDev = process.env.PORT ? false : true;
const httpServer = http.Server(app);
const io = socketIO.listen(httpServer);

let ioGame = io.of("/game");

let mainGame = new Game({mapData: classicMapJSON, io: ioGame});

if(isDev) {
	app.use('/js', express.static(path.join(__dirname, 'src/js')));
}

app.get('/', function(req, res){
	res.sendFile(__dirname + '/public/index.html');
});

app.get('/game', function(req, res){
	res.sendFile(__dirname + '/public/game.html');
});

app.use('/', express.static(path.join(__dirname, 'public')));

ioGame.on('connection', socket => {
	let player = null;
	socket.on('join game', callback => {
		if(!player && typeof callback === "function") {
			let data = mainGame.joinGame(socket);
			player = data.player;

			callback(player.id, data.map, data.SETTINGS);
		}
	});

	socket.on('input', input => {
		if(player && typeof input === "object") {
			player.handleInput(input);
		}
	});
});

httpServer.listen(PORT, function(){
	console.log('listening on *:' + PORT);
});