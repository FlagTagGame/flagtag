const Matter = require('matter-js');
const _ = require('lodash');
const SETTINGS = require('./settings');
const Player = require('./Player');
const Utils = require('./Utils');

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
const Bomb = require('./elements/Bomb');
const Button = require('./elements/Button');

class Game {
	constructor({mapData, io}){
		this.gameInterval = null;
		this.socketInterval = null;

		this.players = {};

		this.events = [];

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
				let worldVector = Utils.TileToXY({x, y});

				if(this.mapData.tiles[y][x] === SETTINGS.TILE_IDS.WALL){
					this.map.push(new Wall(worldVector));
				} else if(this.mapData.tiles[y][x] === SETTINGS.TILE_IDS.REDFLAG){
					this.map.push(new Flag({
						...worldVector,
						team: SETTINGS.TEAM.RED,
						game: this
					}));
				} else if(this.mapData.tiles[y][x] === SETTINGS.TILE_IDS.BLUEFLAG){
					this.map.push(new Flag({
						...worldVector,
						team: SETTINGS.TEAM.BLUE,
						game: this
					}));
				} else if(this.mapData.tiles[y][x] === SETTINGS.TILE_IDS.REDSPAWN){
					this.mapSpawns.red.push(worldVector);
				} else if(this.mapData.tiles[y][x] === SETTINGS.TILE_IDS.BLUESPAWN){
					this.mapSpawns.blue.push(worldVector);
				} else if(this.mapData.tiles[y][x] === SETTINGS.TILE_IDS.SPIKE){
					this.map.push(new Spike({
						...worldVector,
						game: this
					}));
				} else if(this.mapData.tiles[y][x] === SETTINGS.TILE_IDS.BOOST){
					this.map.push(new Boost({
						...worldVector,
						team: SETTINGS.TEAM.NEUTRAL,
						game: this
					}));
				} else if(this.mapData.tiles[y][x] === SETTINGS.TILE_IDS.BOMB){
					this.map.push(new Bomb({
						...worldVector,
						game: this
					}));
				} else if(this.mapData.tiles[y][x] === SETTINGS.TILE_IDS.BUTTON){
					this.map.push(new Button({
						...worldVector,
						game: this
					}));
				}
			}
		}

		// Add all the elements to the world.
		World.add(this.engine.world, this.map.map(a => a.body));

		this.startGameInterval();
	}

	startGameInterval(){
		// Main Game Loop
		// Handles the game logic
		this.gameInterval = setInterval(() => {
			let playersArr = Object.values(this.players);

			playersArr.forEach(player => {
				if(!player.dead){
					// Move the player depending on the keys pressed.
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

					// Clamping the velocity (top speed)
					Body.setVelocity(player.body, {
						x: Math.clamp(player.body.velocity.x, -SETTINGS.BALL.TOP_VELOCITY, SETTINGS.BALL.TOP_VELOCITY),
						y: Math.clamp(player.body.velocity.y, -SETTINGS.BALL.TOP_VELOCITY, SETTINGS.BALL.TOP_VELOCITY)
					});

					// Move the player
					Body.applyForce(player.body, player.body.position, {
						x: moveObj.x + (player.body.velocity.x * 0.000005),
						y: moveObj.y + (player.body.velocity.y * 0.000005)
					});

					// console.log(player.body.velocity);
				}
			});

			Engine.update(this.engine, 1000 / SETTINGS.tickSpeed);
		}, 1000 / SETTINGS.tickSpeed);

		// Main Socket Loop
		// Updates the players.
		this.socketInterval = setInterval(() => {
			let playersObjectKeys = Object.keys(this.players);

			// Convert all the players into something sendable.
			let playersObject = playersObjectKeys.reduce((acc, val) => {
				acc[val] = this.players[val].sendable();

				return acc;
			}, {});

			playersObjectKeys.forEach(key => {
				this.players[key].socket.emit("world data", {
					players: playersObject,
					// Only send the non-static elements (not walls or spikes)
					elements: this.map.filter(a => !a.isStatic).map(a => a.sendable()),
					events: this.events
				});
				// console.log(playersObject);
			});
			this.events = [];
		}, 1000 / SETTINGS.socketTickSpeed);

		// Collision Handling

		// Called once when a collision starts
		Events.on(this.engine, "collisionStart", e => {
			e.pairs.forEach((pair, idx) => {
				// Player vs Player Start Collision handling
				if(detectPairObject(pair, "Player", "Player")){
					let player1 = this.players[pair.bodyA.elementID];
					let player2 = this.players[pair.bodyB.elementID];

					if(player1 && player2){
						// Player vs Player should have 0 friction
						player1.body.friction = 0;
						player2.body.friction = 0;

						// Check if they both aren't dead
						if(!player1.dead && !player2.dead){
							// Check if they aren't on the same team
							if(player1.team !== player2.team){
								// If either of them has the flag, kill them.
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

				// Check if either collided bodies are players.
				if(pair.bodyA.elementType === "Player" || pair.bodyB.elementType === "Player") {
					let playerBody = pair.bodyA.elementType === "Player" ? pair.bodyA : pair.bodyB;
					let elementBody = pair.bodyA.elementType === "Player" ? pair.bodyB : pair.bodyA;

					let playerObj = this.players[playerBody.elementID];
					let elementObj = this.map.find(a => a.id === elementBody.elementID);

					// Call the element's onStartPlayerTouch
					if(elementObj && playerObj && !playerObj.dead) elementObj.onStartPlayerTouch(playerObj);
				}
			});
		});

		// Called when a collision is active
		Events.on(this.engine, "collisionActive", e => {
			e.pairs.forEach((pair, idx) => {
				// Player vs Player Activve Collision handling

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

				// Check if either collided bodies are players.
				if(pair.bodyA.elementType === "Player" || pair.bodyB.elementType === "Player") {
					let playerBody = pair.bodyA.elementType === "Player" ? pair.bodyA : pair.bodyB;
					let elementBody = pair.bodyA.elementType === "Player" ? pair.bodyB : pair.bodyA;

					let playerObj = this.players[playerBody.elementID];
					let elementObj = this.map.find(a => a.id === elementBody.elementID);

					// Call the element's onActivePlayerTouch
					if(elementObj && playerObj && !playerObj.dead) elementObj.onActivePlayerTouch(playerObj);
				}
			});
		});

		// Called once when a collision ends
		Events.on(this.engine, "collisionEnd", e => {
			e.pairs.forEach((pair, idx) => {
				// Player vs Player End Collision handling
				if(detectPairObject(pair, "Player", "Player")){
					let player1 = this.players[pair.bodyA.elementID];
					let player2 = this.players[pair.bodyB.elementID];

					if(player1 && player2){
						// Reset Friction after they stop touching
						player1.body.friction = SETTINGS.BALL.FRICTION;
						player2.body.friction = SETTINGS.BALL.FRICTION;
					}
				}

				// Check if either collided bodies are players.
				if(pair.bodyA.elementType === "Player" || pair.bodyB.elementType === "Player") {
					let playerBody = pair.bodyA.elementType === "Player" ? pair.bodyA : pair.bodyB;
					let elementBody = pair.bodyA.elementType === "Player" ? pair.bodyB : pair.bodyA;

					let playerObj = this.players[playerBody.elementID];
					let elementObj = this.map.find(a => a.id === elementBody.elementID);

					// Call the element's onEndPlayerTouch function
					if(elementObj && playerObj && !playerObj.dead) elementObj.onEndPlayerTouch(playerObj);
				}
			});
		});
	}

	/**
	 * Adds a player to the game using a socket.io object.
	 * @param  {Socket} socket - Player's socket object
	 * @return {Object} Returns data that player needs in the callback. ({player, map, SETTINGS})
	 */
	joinGame(socket){
		// Create the players body
		let body = Bodies.circle(
			(this.mapData.tiles[0].length * SETTINGS.tileSize) / 2,
			(this.mapData.tiles.length * SETTINGS.tileSize) / 2,
			SETTINGS.BALL.SIZE,
			{
				friction: SETTINGS.BALL.FRICTION,
				frictionAir: SETTINGS.BALL.AIR_FRICTION,
				density: SETTINGS.BALL.DENSITY,
				restitution: SETTINGS.BALL.BOUNCINESS
			}
		);
		// Add that body to the world
		World.add(this.engine.world, body);

		// Create a Player instance
		let player = new Player({
			name: "Odd Ball",
			team: Object.keys(this.players).length % 2 === 0 ? SETTINGS.TEAM.RED : SETTINGS.TEAM.BLUE,
			body: body,
			game: this,
			socket: socket
		});
		player.body.elementID = player.id;
		player.body.elementType = "Player";

		// Add the player to the game.
		this.players[player.id] = player;

		// Respawn the player
		this.respawnPlayer(player);

		// Send back data that the client needs.
		return {player, map: {
			elements: this.map.map(a => a.sendable()),
			mapData: this.mapData
		}, SETTINGS};
	}

	/**
	 * Removes player from the game using player object.
	 * @param  {Player} player Player Object
	 * @return {Boolean}       Returns true on success
	 */
	removePlayer(player){
		this.respawnPlayer(player);
		World.remove(this.engine.world, player.body);

		this.events.push({type: SETTINGS.EVENTS.PLAYER_LEFT, data: player.id});

		delete this.players[player.id];

		return true;
	}

	/**
	 * Creates an explosion in the world
	 * @param  {Vector} worldVector Where the explosion should occur in world-space
	 * @param  {Number} range       Range of the explosion in pixels
	 * @param  {Number} power       Power of the explosion
	 * @return {Boolean}            Returns true on success
	 */
	createExplosion(worldVector, range, power){
		Object.keys(this.players).forEach(playerID => {
			let player = this.players[playerID];

			let explosionAngle = Math.atan2(player.body.position.y - worldVector.y, player.body.position.x - worldVector.x);
			let distanceToBomb = Math.distance(player.body.position.x, player.body.position.y, worldVector.x, worldVector.y);

			// If the player is in explosion range
			if(distanceToBomb < range){
				let explosionPower = (range / distanceToBomb) * power;

				// console.log(explosionAngle, explosionPower, distanceToBomb, {x: Math.cos(explosionAngle) * explosionPower, y: Math.sin(explosionAngle) * explosionPower});

				// Need to applyForce asynchronously from this context using setTimeout, since applyForce must be called before the next tick update.
				// May not work without it.
				setTimeout(() => {
					Body.applyForce(player.body, worldVector, {x: Math.cos(explosionAngle) * explosionPower, y: Math.sin(explosionAngle) * explosionPower});
				}, 0);
			}
		});

		return true;
	}

	/**
	 * Kills the player, waits until respawn time is up, then teleports the player to a random spawn point.
	 * @param  {Player}  player Player to respawn
	 * @return {Boolean} Returns true or false depending on success.
	 */
	respawnPlayer(player){
		if(!player.dead && !player.invincible){
			player.die();
			// Reset the players velocity
			Body.setVelocity(player.body, {x: 0, y: 0});

			this.returnFlag(player);

			// After the respawn time is up, find a random spawn point and teleport the player there.
			setTimeout(() => {
				if(!player) return;

				let randomSpawn;

				if(player.team === SETTINGS.TEAM.RED){
					randomSpawn = this.mapSpawns.red[_.random(0, this.mapSpawns.red.length-1)];
					Body.setPosition(player.body, randomSpawn);
				} else if(player.team === SETTINGS.TEAM.BLUE){
					randomSpawn = this.mapSpawns.blue[_.random(0, this.mapSpawns.blue.length-1)];
					Body.setPosition(player.body, randomSpawn);
				}

				// console.log(randomSpawn);
				player.live();
			}, SETTINGS.GAME.RESPAWN_TIME);

			return true;
		}

		return false;
	}

	/**
	 * Bring the flag that the player has back to base.
	 * @param  {Player}  player The player that has the flag.
	 * @return {Boolean} Returns true if successful, false if unsuccessful
	 */
	returnFlag(player){
		// Check if the player has a flag
		if(player.hasFlag){
			// Find the flag the player has
			let flagIndex = this.map.findIndex(a => a.body.elementID === player.hasFlag);

			// Check if the flag was found and that the found element is a flag
			if(flagIndex > -1 && this.map[flagIndex].body.elementType === "Flag") {
				// Give the flag back to the flag (lul)
				this.map[flagIndex].taken = false;
				// Take the flag away from the player
				player.hasFlag = false;

				return true;
			}
		}

		return false;
	}
}

/**
 * Given a body pair, this function detects both element types exist inside the pair.
 * @param  {Object}  pair         Matter.js Body Pair to check
 * @param  {String}  elementType1 An Element Type
 * @param  {String}  elementType2 Another Element Type
 * @return {Boolean} Returns true if detected both elements, otherwise returns false.
 */
function detectPairObject(pair, elementType1, elementType2){
	let pairArr = [pair.bodyA.elementType, pair.bodyB.elementType];
	pairArr.splice(pairArr.indexOf(elementType1), 1);
	pairArr.splice(pairArr.indexOf(elementType2), 1);

	return pairArr.length === 0;
}

/**
 * Given a body pair, this function returns a body that matches the element type. 
 * @param  {Object} pair        Matter.js Body Pair
 * @param  {String} elementType The element type to find
 * @return {Body|Boolean}       Returns false if it can't find a body.
 */
function getPairObject(pair, elementType){
	if(pair.bodyA.elementType === elementType){
		return pair.bodyA;
	} else if(pair.bodyB.elementType === elementType){
		return pair.bodyB;
	} else {
		return false;
	}
}

/**
 * Clamps a number between a maximum and minimum
 * @param  {Number} num The source number
 * @param  {Number} min The minimum value the number can't go below
 * @param  {Number} max The maximum value the number can't go higher than
 * @return {Number}
 */
Math.clamp = (num, min, max) => Math.max(Math.min(num, max), min);

module.exports = Game;