const Matter = require('matter-js');
const _ = require('lodash');
const SETTINGS = require('./settings');
const Player = require('./Player');

let Engine = Matter.Engine,
	Render = Matter.Render,
	World = Matter.World,
	Events = Matter.Events,
	Body = Matter.Body,
	Bodies = Matter.Bodies;

const Wall = require('./elements/Wall');
const Flag = require('./elements/Flag');
const Spike = require('./elements/Spike');
const Boost = require('./elements/Boost');

class Game {
	constructor({mapData, io}){
		this.gameInterval = null;
		this.socketInterval = null;

		this.players = {};

		this.engine = Engine.create();
		this.engine.world.gravity.scale = 0;

		this.score = {
			red: 0,
			blue: 0
		};

		// Map Properties
		this.mapData = mapData;
		this.map = [];
		this.mapSpawns = {
			red: [],
			blue: []
		};

		// Map Body Builder
		// Goes through each tile and places the correct game element at that position.
		for (let y = this.mapData.tiles.length - 1; y >= 0; y--) {
			for (let x = this.mapData.tiles[y].length - 1; x >= 0; x--) {
				if(this.mapData.tiles[y][x] === SETTINGS.TILE_IDS.WALL){
					this.map.push(new Wall({x: (x * SETTINGS.tileSize) + (SETTINGS.tileSize / 2), y: (y * SETTINGS.tileSize) + (SETTINGS.tileSize / 2)}));
				} else if(this.mapData.tiles[y][x] === SETTINGS.TILE_IDS.REDFLAG){
					this.map.push(new Flag({
						x: (x * SETTINGS.tileSize) + (SETTINGS.tileSize / 2),
						y: (y * SETTINGS.tileSize) + (SETTINGS.tileSize / 2),
						team: SETTINGS.TEAM.RED,
						game: this
					}));
				} else if(this.mapData.tiles[y][x] === SETTINGS.TILE_IDS.BLUEFLAG){
					this.map.push(new Flag({
						x: (x * SETTINGS.tileSize) + (SETTINGS.tileSize / 2),
						y: (y * SETTINGS.tileSize) + (SETTINGS.tileSize / 2),
						team: SETTINGS.TEAM.BLUE,
						game: this
					}));
				} else if(this.mapData.tiles[y][x] === SETTINGS.TILE_IDS.REDSPAWN){
					this.mapSpawns.red.push({x: (x * SETTINGS.tileSize) + (SETTINGS.tileSize / 2), y: (y * SETTINGS.tileSize) + (SETTINGS.tileSize / 2)});
				} else if(this.mapData.tiles[y][x] === SETTINGS.TILE_IDS.BLUESPAWN){
					this.mapSpawns.blue.push({x: (x * SETTINGS.tileSize) + (SETTINGS.tileSize / 2), y: (y * SETTINGS.tileSize) + (SETTINGS.tileSize / 2)});
				} else if(this.mapData.tiles[y][x] === SETTINGS.TILE_IDS.SPIKE){
					this.map.push(new Spike({
						x: (x * SETTINGS.tileSize) + (SETTINGS.tileSize / 2),
						y: (y * SETTINGS.tileSize) + (SETTINGS.tileSize / 2),
						game: this
					}));
				} else if(this.mapData.tiles[y][x] === SETTINGS.TILE_IDS.BOOST){
					this.map.push(new Boost({
						x: (x * SETTINGS.tileSize) + (SETTINGS.tileSize / 2),
						y: (y * SETTINGS.tileSize) + (SETTINGS.tileSize / 2),
						team: SETTINGS.TEAM.NEUTRAL,
						game: this
					}));
				}
			}
		}

		World.add(this.engine.world, this.map.map(a => a.body));

		this.startGameInterval();
	}

	startGameInterval(){
		this.gameInterval = setInterval(() => {
			let playersArr = Object.values(this.players);

			playersArr.forEach(player => {
				if(!player.dead){
					let moveObj = {x: 0, y: 0};
					if(player.input.left) {
						moveObj.x -= SETTINGS.BALL.ACCELERATION;
					} else if(player.input.right) {
						moveObj.x += SETTINGS.BALL.ACCELERATION;
					}

					if(player.input.up) {
						moveObj.y -= SETTINGS.BALL.ACCELERATION;
					} else if(player.input.down) {
						moveObj.y += SETTINGS.BALL.ACCELERATION;
					}

					Body.setVelocity(player.body, {
						x: Math.clamp(player.body.velocity.x, -SETTINGS.BALL.TOP_VELOCITY, SETTINGS.BALL.TOP_VELOCITY),
						y: Math.clamp(player.body.velocity.y, -SETTINGS.BALL.TOP_VELOCITY, SETTINGS.BALL.TOP_VELOCITY)
					});

					Body.applyForce(player.body, player.body.position, {
						x: moveObj.x + (player.body.velocity.x * 0.000005),
						y: moveObj.y + (player.body.velocity.y * 0.000005)
					});

					// console.log(player.body.velocity);
				}
			});

			Engine.update(this.engine, 1000 / SETTINGS.tickSpeed);
		}, 1000 / SETTINGS.tickSpeed);

		this.socketInterval = setInterval(() => {
			let playersObjectKeys = Object.keys(this.players);

			let playersObject = playersObjectKeys.reduce((acc, val) => {
				acc[val] = this.players[val].sendable();

				return acc;
			}, {});

			playersObjectKeys.forEach(key => {
				this.players[key].socket.emit("world data", {
					players: playersObject,
					elements: this.map.filter(a => !a.isStatic).map(a => a.sendable())
				});
				// console.log(playersObject);
			});
		}, 1000 / SETTINGS.socketTickSpeed);

		Events.on(this.engine, "collisionStart", e => {
			e.pairs.forEach((pair, idx) => {
				if(detectPairObject(pair, "Player", "Player")){
					let player1 = this.players[pair.bodyA.elementID];
					let player2 = this.players[pair.bodyB.elementID];

					if(player1 && player2){
						if(!player1.dead && !player2.dead){
							if(player1.team !== player2.team){
								if(player1.hasFlag){
									this.respawnPlayer(player1);
								}

								if(player2.hasFlag){
									this.respawnPlayer(player2);
								}
							}
						}
					}
				}

				if(pair.bodyA.elementType === "Player" || pair.bodyB.elementType === "Player") {
					let playerBody = pair.bodyA.elementType === "Player" ? pair.bodyA : pair.bodyB;
					let elementBody = pair.bodyA.elementType === "Player" ? pair.bodyB : pair.bodyA;

					let playerObj = this.players[playerBody.elementID];
					let elementObj = this.map.find(a => a.id === elementBody.elementID);

					if(elementObj && playerObj && !playerObj.dead) elementObj.onStartPlayerTouch(playerObj);
				}
			});
		});

		Events.on(this.engine, "collisionActive", e => {
			e.pairs.forEach((pair, idx) => {
				// console.log(pair.bodyA.elementType, pair.bodyB.elementType)
				if(detectPairObject(pair, "Player", "Player")){
					let player1 = this.players[pair.bodyA.elementID];
					let player2 = this.players[pair.bodyB.elementID];

					if(player1 && player2){
						if(!player1.dead && !player2.dead){
							if(player1.team !== player2.team){
								if(player1.hasFlag){
									this.respawnPlayer(player1);
								}

								if(player2.hasFlag){
									this.respawnPlayer(player2);
								}
							}
						}
					}
				}

				if(pair.bodyA.elementType === "Player" || pair.bodyB.elementType === "Player") {
					let playerBody = pair.bodyA.elementType === "Player" ? pair.bodyA : pair.bodyB;
					let elementBody = pair.bodyA.elementType === "Player" ? pair.bodyB : pair.bodyA;

					let playerObj = this.players[playerBody.elementID];
					let elementObj = this.map.find(a => a.id === elementBody.elementID);

					if(elementObj && playerObj && !playerObj.dead) elementObj.onActivePlayerTouch(playerObj);
				}
			});
		});
	}

	joinGame(socket){
		let body = Bodies.circle(
			(this.mapData.tiles[0].length * SETTINGS.tileSize) / 2,
			(this.mapData.tiles.length * SETTINGS.tileSize) / 2,
			SETTINGS.BALL.SIZE,
			{
				friction: 0.05,
				frictionAir: 0.02,
				density: SETTINGS.BALL.DENSITY,
				restitution: SETTINGS.BALL.BOUNCINESS
			}
		);
		World.add(this.engine.world, body);

		let player = new Player({
			name: "Odd Ball",
			team: Object.keys(this.players).length % 2 === 0 ? SETTINGS.TEAM.RED : SETTINGS.TEAM.BLUE,
			body: body,
			game: this,
			socket: socket
		});
		player.body.elementID = player.id;
		player.body.elementType = "Player";

		this.players[player.id] = player;

		this.respawnPlayer(player);

		return {player, map: {
			elements: this.map.map(a => a.sendable()),
			mapData: this.mapData
		}, SETTINGS};
	}

	respawnPlayer(player){
		if(!player.dead && !player.invincible){
			player.die();
			Body.setVelocity(player.body, {x: 0, y: 0});

			this.returnFlag(player);

			setTimeout(() => {
				let randomSpawn;

				if(player.team === SETTINGS.TEAM.RED){
					randomSpawn = this.mapSpawns.red[_.random(0, this.mapSpawns.red.length-1)];
					Body.setPosition(player.body, randomSpawn);
				} else if(player.team === SETTINGS.TEAM.BLUE){
					randomSpawn = this.mapSpawns.blue[_.random(0, this.mapSpawns.blue.length-1)];
					Body.setPosition(player.body, randomSpawn);
				}

				console.log(randomSpawn);
				if(player) player.live();
			}, SETTINGS.GAME.RESPAWN_TIME);
		}
	}

	// Returns flag that the player has back to base.
	returnFlag(player){
		let flagIndex = this.map.findIndex(a => a.body.elementID === player.hasFlag);

		if(flagIndex > -1 && this.map[flagIndex].body.elementType === "Flag") {
			this.map[flagIndex].taken = false;
			player.hasFlag = false;
		}
	}
}

function detectPairObject(pair, elementType1, elementType2){
	let pairArr = [pair.bodyA.elementType, pair.bodyB.elementType];
	pairArr.splice(pairArr.indexOf(elementType1), 1);
	pairArr.splice(pairArr.indexOf(elementType2), 1);

	return pairArr.length === 0;
}

function getPairObject(pair, elementType){
	if(pair.bodyA.elementType === elementType){
		return pair.bodyA;
	} else if(pair.bodyB.elementType === elementType){
		return pair.bodyB;
	}
}

Math.clamp = (num, min, max) => Math.max(Math.min(num, max), min);

module.exports = Game;