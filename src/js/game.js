let config = {
	type: Phaser.AUTO,
	width: 1280,
	height: 800,
	resolution: 2,
	scene: {
		preload: preload,
		create: create,
		update: update
	}
};

// Matter Aliases
let Engine = Matter.Engine,
	Body = Matter.Body,
	World = Matter.World,
	Bodies = Matter.Bodies;

// Connect to the socket.io "/game" namespace
let socket = io("/game");
// Initializing the Client's Player ID, gets set when the player joins the game
let clientPlayerID;
// Initialize Phaser Game Object
let game = new Phaser.Game(config);
// For storing Phaser Scene
let scene;

// Storing Controls
let controls;

// Stores game data acquired from server
let gameData = {};
let gameState = {};
let oldGameData = {};

// Player's Sprites
let playerSprites = {};

let timeText;
let redScoreText;
let blueScoreText;

// Shared Server and Client Settings, is set when player joins game.
let SETTINGS = {};

let TEAM_TO_NAME = {};
let POWERUP_TO_NAME = {};

let playerSettings = JSON.parse(localStorage.getItem("settings"));

let CLIENT_SETTINGS = {
	FRAMES: {
		FLOOR: 77,
		WALL: -1,
		REDFLAG: 30,
		BLUEFLAG: 31,
		REDBALL: 14,
		BLUEBALL: 15,
		SPIKE: 12,
		BOMB_ON: 28,
		BOMB_OFF: 44,
		BUTTON: 109,
		NONEGATE: 60,
		NEUTRALGATE: 61,
		REDGATE: 62,
		BLUEGATE: 63,
		NEUTRALTEAMTILE: 93,
		REDTEAMTILE: 94,
		BLUETEAMTILE: 95,
		POWERUP_OFF: 140,
		POWERUP_FORCEFIELD: 108,
		POWERUP_CONTACT_BOMB: 92,
		POWERUP_ENERGIZER: 76
	}
};

let SOUNDS = {
	BOOST: new Howl({
		src: [API_URL('assets/sounds/boost.mp3')]
	}),
	BOMB: new Howl({
		src: [API_URL('assets/sounds/bomb.mp3')]
	}),
	POWERUP: new Howl({
		src: [API_URL('assets/sounds/powerup.wav')]
	}),
	POP: new Howl({
		src: [API_URL('assets/sounds/pop.mp3')]
	}),
	BUTTON_OFF: new Howl({
		src: [API_URL('assets/sounds/button_off.mp3')]
	}),
	BUTTON_ON: new Howl({
		src: [API_URL('assets/sounds/button_on.mp3')]
	}),
	ALERT: new Howl({
		src: [API_URL('assets/sounds/alert.mp3')]
	}),
	DROP: new Howl({
		src: [API_URL('assets/sounds/drop.mp3')]
	}),
	FRIENDLY_GRAB: new Howl({
		src: [API_URL('assets/sounds/friendlygrab.mp3')]
	}),
	WIN: new Howl({
		src: [API_URL('assets/sounds/win.mp3')]
	}),
	LOSE: new Howl({
		src: [API_URL('assets/sounds/lose.mp3')]
	})
};

let playSound = sound => {
	if(!SOUNDS[sound].playing()) SOUNDS[sound].play();
}

let mapSprites = {
	floors: [],
	walls: {},
	flags: {},
	spikes: {},
	boosts: {},
	bombs: {},
	buttons: {},
	gates: {},
	teamtiles: {},
	portals: {},
	powerups: {}
};

let effectSprites = {
	splats: {}
};

// Initialize Matter.js Engine
let engine = Engine.create();
// Disable Gravity
engine.world.gravity.scale = 0;

function preload(){
	// Set scene
	scene = this;

	// Load sprite images
	scene.load.spritesheet("tiles", API_URL("assets/tiles.png"), {frameWidth: 40, frameHeight: 40});
	scene.load.spritesheet("neutralboost", API_URL("assets/boost.png"), {frameWidth: 40, frameHeight: 40});
	scene.load.spritesheet("redboost", API_URL("assets/redboost.png"), {frameWidth: 40, frameHeight: 40});
	scene.load.spritesheet("blueboost", API_URL("assets/blueboost.png"), {frameWidth: 40, frameHeight: 40});
	scene.load.spritesheet("portal", API_URL("assets/portal.png"), {frameWidth: 40, frameHeight: 40});
	scene.load.spritesheet("powerups", API_URL("assets/powerups.png"), {frameWidth: 40, frameHeight: 40});
	scene.load.spritesheet("splats", API_URL("assets/splats.png"), {frameWidth: 120, frameHeight: 120});
	scene.load.spritesheet("walls", API_URL("assets/walls.png"), {frameWidth: 40, frameHeight: 40});
}

function create(){
	// Set scene
	scene = this;

	// Set controls
	controls = {
		up: scene.input.keyboard.addKey(87),
		down: scene.input.keyboard.addKey(83),
		left: scene.input.keyboard.addKey(65),
		right: scene.input.keyboard.addKey(68),
		up2: scene.input.keyboard.addKey(38),
		down2: scene.input.keyboard.addKey(40),
		left2: scene.input.keyboard.addKey(37),
		right2: scene.input.keyboard.addKey(39)
	};

	// Removing Key Capture on all the keys
	// Allows these keys to be used outside of Phaser Canvas
	// Without it, you wouldn't be able to type inside an input element.
	Object.keys(controls).forEach(key => {
		scene.input.keyboard.removeCapture(controls[key].keyCode);
	});

	// Create boost animation
	scene.anims.create({
		key: 'neutralboost_on',
		frames: scene.anims.generateFrameNumbers('neutralboost', {start: 0, end: 3}),
		frameRate: 10,
		repeat: -1
	});

	scene.anims.create({
		key: 'redboost_on',
		frames: scene.anims.generateFrameNumbers('redboost', {start: 0, end: 3}),
		frameRate: 10,
		repeat: -1
	});

	scene.anims.create({
		key: 'blueboost_on',
		frames: scene.anims.generateFrameNumbers('blueboost', {start: 0, end: 3}),
		frameRate: 10,
		repeat: -1
	});

	scene.anims.create({
		key: 'portal_on',
		frames: scene.anims.generateFrameNumbers('portal', {start: 0, end: 3}),
		frameRate: 10,
		repeat: -1
	});

	timeText = scene.add.text(scene.cameras.main.displayWidth / 2, scene.cameras.main.displayHeight * 0.9, "00:00", {
		fontFamily: "Lato",
		fontSize: "40px",
		fontStyle: "bold",
		fill: "#EEEEEE",
		stroke: "#111111",
		strokeThickness: 8
	});

	redScoreText = scene.add.text((scene.cameras.main.displayWidth / 2) - timeText.width, scene.cameras.main.displayHeight * 0.9, "0", {
		fontFamily: "Lato",
		fontSize: "40px",
		fontStyle: "bold",
		fill: "#FF0000",
		stroke: "#111111",
		strokeThickness: 8
	});

	blueScoreText = scene.add.text((scene.cameras.main.displayWidth / 2) + timeText.width, scene.cameras.main.displayHeight * 0.9, "0", {
		fontFamily: "Lato",
		fontSize: "40px",
		fontStyle: "bold",
		fill: "#0065FF",
		stroke: "#111111",
		strokeThickness: 8
	});

	timeText.x -= timeText.width / 2;
	redScoreText.x -= redScoreText.width / 2;
	blueScoreText.x -= blueScoreText.width / 2;

	timeText.setScrollFactor(0);
	timeText.setAlpha(0.8);

	redScoreText.setScrollFactor(0);
	redScoreText.setAlpha(0.8);

	blueScoreText.setScrollFactor(0);
	blueScoreText.setAlpha(0.8);

	// Join a Game
	// Callback is called on success
	socket.emit("join game", {
		gameID: getUrlVars()["g"],
		playerSettings: {
			name: playerSettings.name
		}
	}, starterData => {
		if(!starterData) location.href = API_URL("");
		// Store Shared Settings
		SETTINGS = starterData.SETTINGS;
		// Store Client's player ID
		clientPlayerID = starterData.playerID;

		gameState = starterData.gameData.gameState;

		gameData = starterData.gameData;
		oldGameData = gameData;
		// For converting Team ID into the team name
		TEAM_TO_NAME = Object.keys(SETTINGS.TEAM).reduce((acc, val) => {
			acc[SETTINGS.TEAM[val]] = val;
			return acc;
		}, {});

		POWERUP_TO_NAME = Object.keys(SETTINGS.POWERUPS).reduce((acc, val) => {
			acc[SETTINGS.POWERUPS[val]] = val;
			return acc;
		}, {});

		// Go through the 2d tile array to build the map
		starterData.map.mapData.tiles.forEach((tileRow, y) => {
			tileRow.forEach((tileID, x) => {
				let sprite = null;

				let xPos = (x * SETTINGS.tileSize) + (SETTINGS.tileSize / 2);
				let yPos = (y * SETTINGS.tileSize) + (SETTINGS.tileSize / 2);

				if(tileID !== SETTINGS.TILE_IDS.BACKGROUND){
					sprite = scene.add.image(xPos, yPos, "tiles");
					sprite.setFrame(CLIENT_SETTINGS.FRAMES.FLOOR);

					mapSprites.floors.push(sprite);
				}
			});
		});

		// Go through each map element to build the rest of the map.
		starterData.map.elements.forEach(element => {
			let sprite = null;

			let xPos = element.x;
			let yPos = element.y;

			// console.log(element);

			if(element.type === "Wall"){
				mapSprites.walls[element.id] = scene.add.image(xPos, yPos, "walls");

				if(element.wallType === "full") {
					mapSprites.walls[element.id].setFrame(4);
				} else if(element.wallType === "tl") {
					mapSprites.walls[element.id].setFrame(2);
					mapSprites.walls[element.id].x += 7;
					mapSprites.walls[element.id].y += 7;
				} else if(element.wallType === "tr") {
					mapSprites.walls[element.id].setFrame(0);
					mapSprites.walls[element.id].x -= 7;
					mapSprites.walls[element.id].y += 7;
				} else if(element.wallType === "bl") {
					mapSprites.walls[element.id].setFrame(3);
					mapSprites.walls[element.id].x += 7;
					mapSprites.walls[element.id].y -= 7;
				} else if(element.wallType === "br") {
					mapSprites.walls[element.id].setFrame(1);
					mapSprites.walls[element.id].x -= 7;
					mapSprites.walls[element.id].y -= 7;
				}
			} else if(element.type === "Flag"){
				let flagSprite = scene.add.image(xPos, yPos, "tiles");
				flagSprite.setFrame(CLIENT_SETTINGS.FRAMES[TEAM_TO_NAME[element.team] + "FLAG"]);
				mapSprites.flags[element.id] = flagSprite;
			} else if(element.type === "Spike"){
				let spikeSprite = scene.add.image(xPos, yPos, "tiles");
				spikeSprite.setFrame(CLIENT_SETTINGS.FRAMES.SPIKE);
				mapSprites.spikes[element.id] = spikeSprite;
			} else if(element.type === "Boost"){
				let boostSprite = scene.add.sprite(xPos, yPos, "neutralboost", 0);
				mapSprites.boosts[element.id] = boostSprite;
			} else if(element.type === "Bomb"){
				let bombSprite = scene.add.sprite(xPos, yPos, "tiles");
				bombSprite.setFrame(CLIENT_SETTINGS.FRAMES.BOMB_ON);
				mapSprites.bombs[element.id] = bombSprite;
			} else if(element.type === "Button"){
				let buttonSprite = scene.add.sprite(xPos, yPos, "tiles");
				buttonSprite.setFrame(CLIENT_SETTINGS.FRAMES.BUTTON);
				mapSprites.buttons[element.id] = buttonSprite;
			} else if(element.type === "Gate"){
				let gateSprite = scene.add.image(xPos, yPos, "tiles");
				gateSprite.setFrame(CLIENT_SETTINGS.FRAMES[TEAM_TO_NAME[element.state] + "GATE"]);
				mapSprites.gates[element.id] = gateSprite;
			} else if(element.type === "Teamtile"){
				// console.log(element);
				let teamtileSprite = scene.add.image(xPos, yPos, "tiles");
				teamtileSprite.setFrame(CLIENT_SETTINGS.FRAMES[TEAM_TO_NAME[element.team] + "TEAMTILE"]);
				mapSprites.teamtiles[element.id] = teamtileSprite;
			} else if(element.type === "Portal"){
				let portalSprite = scene.add.sprite(xPos, yPos, "portal", 0);
				mapSprites.portals[element.id] = portalSprite;
			} else if(element.type === "Powerup"){
				let powerupSprite = scene.add.sprite(xPos, yPos, "tiles", 0);
				powerupSprite.setFrame(CLIENT_SETTINGS.FRAMES.POWERUP_OFF);
				mapSprites.powerups[element.id] = powerupSprite;
			}
		});
		
		// Setup all the socket event handlers
		socketHandler();
	});
}

function update(){
	if(gameState.ended) return;
	// Check if the clients sprite exists.
	if(playerSprites[clientPlayerID]){
		scene.children.bringToTop(timeText);
		scene.children.bringToTop(redScoreText);
		scene.children.bringToTop(blueScoreText);

		timeText.setText(secondsToMMSS((gameState.gameEndsAt - Date.now()) / 1000));

		redScoreText.setText(gameState.score.red);
		blueScoreText.setText(gameState.score.blue);

		// Refer to "input" key in settings.js
		let inputObj = {
			up: controls.up.isDown || controls.up2.isDown,
			down: controls.down.isDown || controls.down2.isDown,
			left: controls.left.isDown || controls.left2.isDown,
			right: controls.right.isDown || controls.right2.isDown,
		};

		// send input
		socket.emit("input", inputObj);
	}

	// Iterate through each player sprite
	Object.keys(playerSprites).forEach(playerID => {
		let playerData = gameData.players[playerID];

		if(playerSprites[playerID]) {
			// Set Ball Position
			playerSprites[playerID].x = playerSprites[playerID].spriteBody.position.x;
			playerSprites[playerID].y = playerSprites[playerID].spriteBody.position.y;

			// Hide the player if they're dead
			playerSprites[playerID].setVisible(!playerData.dead);
			playerSprites[playerID].usernameText.setVisible(!playerData.dead);

			// Set Flag Position
			playerSprites[playerID].flagSprite.x = playerSprites[playerID].x + (SETTINGS.BALL.SIZE / 2.5);
			playerSprites[playerID].flagSprite.y = playerSprites[playerID].y - (SETTINGS.BALL.SIZE * 1.5);

			// Set Username Position
			playerSprites[playerID].usernameText.x = playerSprites[playerID].x + (SETTINGS.BALL.SIZE / 2);
			playerSprites[playerID].usernameText.y = playerSprites[playerID].y - (SETTINGS.BALL.SIZE * 1.5);

			// Set Powerup Positions
			Object.keys(playerSprites[playerID].powerupSprites).forEach(key => {
				playerSprites[playerID].powerupSprites[key].setPosition(playerSprites[playerID].x, playerSprites[playerID].y);
			});

			playerData.pups.split("").forEach((data, idx) => {
				let isOn = data === "1" ? true : false;
				// console.log(playerData.pups, POWERUP_TO_NAME[idx+1], idx, playerSprites[playerID].powerupSprites);
				playerSprites[playerID].powerupSprites[POWERUP_TO_NAME[idx+1].toLowerCase()].setVisible(isOn && !playerData.dead);
			});

			// Set Ball Rotation
			playerSprites[playerID].setRotation(playerSprites[playerID].spriteBody.angle);

			// Show the flag is the player has it
			if(playerData.hF) {
				// Set Frame to flag frame of players team
				playerSprites[playerID].flagSprite.setFrame(
					CLIENT_SETTINGS.FRAMES[TEAM_TO_NAME[playerData.t === SETTINGS.TEAM.RED ? SETTINGS.TEAM.BLUE : SETTINGS.TEAM.RED] + "FLAG"]
				);
				playerSprites[playerID].flagSprite.setVisible(true);
			} else {
				playerSprites[playerID].flagSprite.setVisible(false);
			}
		} else {
			// Create player sprite if it doesn't exist
			playerSprites[playerID] = createPlayerSprite(playerData);
		}
	});

	// update engine
	Engine.update(engine, 1000 / 60);
}

function socketHandler(){
	socket.on("stopped game", () => {
		location.href = API_URL("");
	});

	socket.on("world data", data => {
		let partialGameData = msgpack.deserialize(data);
		// console.log(partialGameData.players, partialGameData.elements);
		gameData = {
			...partialGameData,
			players: _.merge(gameData.players, partialGameData.players),
			elements: gameData.elements.map((elem, idx) => {
				let foundElem = elem;
				for (let i = partialGameData.elements.length - 1; i >= 0; i--) {
					if(partialGameData.elements[i].id === elem.id) {
						foundElem = partialGameData.elements[i];
						break;
					}
				}
				return foundElem;
			})
		}
		
		gameState = gameData.gameState;

		// Iterate through the player data's and update the client side prediction bodies.
		Object.keys(gameData.players).forEach(playerID => {
			let playerData = gameData.players[playerID];

			if(playerSprites[playerID]) {
				Body.setPosition(playerSprites[playerID].spriteBody, {x: playerData.x, y: playerData.y});
				Body.setVelocity(playerSprites[playerID].spriteBody, {x: playerData.xV * 0.6, y: playerData.yV * 0.6});
				Body.setAngle(playerSprites[playerID].spriteBody, playerData.r);
			} else {
				playerSprites[playerID] = createPlayerSprite(playerData);
			}
		});

		// Update the game elements.
		gameData.elements.forEach((element, idx) => {
			if(!pointIsInViewport(gameData.elements[idx])) return;

			if(element.type === "Flag") {
				mapSprites.flags[element.id].setAlpha(element.taken ? 0.4 : 1);

				if(oldGameData.elements[idx]){
					if(oldGameData.elements[idx].taken !== gameData.elements[idx].taken) {
						if(gameData.elements[idx].taken){
							if(gameData.players[clientPlayerID].t === gameData.elements[idx].team){
								playSound("ALERT");
							} else {
								playSound("FRIENDLY_GRAB");
							}
						} else {
							playSound("DROP");
						}
					}
				}
			} else if(element.type === "Boost") {
				// Play Boost Animation if its on
				if(element.isOn) {
					mapSprites.boosts[element.id].anims.play(TEAM_TO_NAME[element.team].toLowerCase() + "boost_on", true);
				} else {
					// Stop the animation if the boost is off
					mapSprites.boosts[element.id].anims.stop(TEAM_TO_NAME[element.team].toLowerCase() + "boost_on");
					mapSprites.boosts[element.id].setFrame(4);
				}

				if(oldGameData.elements[idx]){
					if(oldGameData.elements[idx].isOn !== gameData.elements[idx].isOn && !gameData.elements[idx].isOn) {
						playSound("BOOST");
					}
				}
			} else if(element.type === "Bomb") {
				if(element.isOn) {
					mapSprites.bombs[element.id].setFrame(CLIENT_SETTINGS.FRAMES.BOMB_ON);
				} else {
					mapSprites.bombs[element.id].setFrame(CLIENT_SETTINGS.FRAMES.BOMB_OFF);
				}

				if(oldGameData.elements[idx]){
					if(oldGameData.elements[idx].isOn !== gameData.elements[idx].isOn && !gameData.elements[idx].isOn) {
						playSound("BOMB");
					}
				}
			} else if(element.type === "Button") {
				if(oldGameData.elements[idx]){
					if(oldGameData.elements[idx].isOn !== gameData.elements[idx].isOn) {
						if(gameData.elements[idx].isOn){
							playSound("BUTTON_ON");
						} else {
							playSound("BUTTON_OFF");
						}
					}
				}
			} else if(element.type === "Gate") {
				mapSprites.gates[element.id].setFrame(CLIENT_SETTINGS.FRAMES[TEAM_TO_NAME[element.state] + "GATE"]);
			} else if(element.type === "Portal") {
				// Play Portal Animation if its on
				if(element.isOn) {
					mapSprites.portals[element.id].anims.play("portal_on", true);
				} else {
					// Stop the animation if the portal is off
					mapSprites.portals[element.id].anims.stop("portal_on");
					mapSprites.portals[element.id].setFrame(4);
				}
			} else if(element.type === "Powerup") {
				if(element.isOn) {
					mapSprites.powerups[element.id].setFrame(CLIENT_SETTINGS.FRAMES["POWERUP_" + POWERUP_TO_NAME[element.powerupType]]);
				} else {
					mapSprites.powerups[element.id].setFrame(CLIENT_SETTINGS.FRAMES.POWERUP_OFF);
				}

				if(oldGameData.elements[idx]){
					if(oldGameData.elements[idx].isOn !== gameData.elements[idx].isOn && !gameData.elements[idx].isOn) {
						playSound("POWERUP");
					}
				}
			}
		});

		// when clients team score is bigger than old score, play correct sound
		if(gameData.gameState.score.red > oldGameData.gameState.score.red) {
			if(gameData.players[clientPlayerID].t === SETTINGS.TEAM.RED) {
				playSound("WIN");
			} else {
				playSound("LOSE");
			}
		}

		if(gameData.gameState.score.blue > oldGameData.gameState.score.blue) {
			if(gameData.players[clientPlayerID].t === SETTINGS.TEAM.BLUE) {
				playSound("WIN");
			} else {
				playSound("LOSE");
			}
		}

		// Update game events
		gameData.events.forEach(event => {
			let eventType = event[0];
			let eventData = event[1];

			if(eventType === SETTINGS.EVENTS.PLAYER_LEFT){
				let removedPlayerID = eventData;

				removePlayerSprite(removedPlayerID);
			} else if(eventType === SETTINGS.EVENTS.PLAYER_POPPED){
				let poppedPlayerID = eventData;

				if(pointIsInViewport(playerSprites[poppedPlayerID])) playSound("POP");
				effectSprites.splats[poppedPlayerID] = scene.add.image(playerSprites[poppedPlayerID].x, playerSprites[poppedPlayerID].y, "splats", gameData.players[poppedPlayerID].t === SETTINGS.TEAM.RED ? getRandomInt(0, 7) : getRandomInt(7, 13));
			}
		});

		oldGameData = gameData;
	});
}

function createPlayerSprite(playerData){
	let sprite = scene.add.sprite(0, 0, "tiles");
	sprite.setFrame(CLIENT_SETTINGS.FRAMES[TEAM_TO_NAME[playerData.t] + "BALL"]);

	sprite.spriteBody = Bodies.circle(0, 0, SETTINGS.BALL.SIZE, {
		friction: SETTINGS.BALL.FRICTION,
		frictionAir: SETTINGS.BALL.AIR_FRICTION,
		density: SETTINGS.BALL.DENSITY,
		restitution: SETTINGS.BALL.BOUNCINESS
	});

	World.add(engine.world, sprite.spriteBody);

	sprite.usernameText = scene.add.text(0, 0, playerData.name, {
		fontFamily: "Lato",
		fontSize: "14px",
		fill: "#EEEEEE",
		stroke: "#111111",
		strokeThickness: 3
	});

	sprite.flagSprite = scene.add.sprite(0, 0, "tiles");
	sprite.flagSprite.setFrame(CLIENT_SETTINGS.FRAMES.REDFLAG);
	sprite.flagSprite.setVisible(false);

	sprite.powerupSprites = {};

	Object.keys(POWERUP_TO_NAME).forEach(key => {
		sprite.powerupSprites[POWERUP_TO_NAME[key].toLowerCase()] = scene.add.sprite(0, 0, "powerups");
		sprite.powerupSprites[POWERUP_TO_NAME[key].toLowerCase()].setFrame(key - 1);
		sprite.powerupSprites[POWERUP_TO_NAME[key].toLowerCase()].setVisible(false);
	});

	if(playerData.id === clientPlayerID){
		scene.cameras.main.startFollow(sprite);
	}

	return sprite;
}

function removePlayerSprite(playerID){
	// Remove Ball Body from world
	World.remove(engine.world, playerSprites[playerID].spriteBody);

	// Destroy all child sprites
	playerSprites[playerID].flagSprite.destroy();
	playerSprites[playerID].powerupSprite.destroy();
	playerSprites[playerID].destroy();

	// Delete sprite from playerSprites
	delete playerSprites[playerID];

	return playerID;
}

function getRandomInt(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

function secondsToMMSS(timeInSeconds) {
	let pad = function(num, size) { return ('000' + num).slice(size * -1); },
	time = parseFloat(timeInSeconds).toFixed(3),
	minutes = Math.floor(time / 60) % 60,
	seconds = Math.floor(time - minutes * 60);

	return pad(minutes, 2) + ':' + pad(seconds, 2);
}

function getUrlVars(){
	let vars = [], hash;
	let hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');

	for(let i = 0; i < hashes.length; i++){
		hash = hashes[i].split('=');
		hash[1] = unescape(hash[1]);
		vars.push(hash[0]);
		vars[hash[0]] = hash[1];
	}

	return vars;
}

function decodeMessengerPack(data, key) {
	return key.reduce((acc, val, idx) => {
		acc[val] = data[idx];
		return acc;
	}, {});
};

function exists(...values){
	return values.every(value => typeof value !== "undefined");
}

function pointIsInViewport(point){
	let viewRect = new Rectangle({
		x: scene.cameras.main.scrollX,
		y: scene.cameras.main.scrollY,
		w: scene.cameras.main.displayWidth,
		h: scene.cameras.main.displayHeight
	});
	return checkIntersection(viewRect, new Rectangle({x: point.x, y: point.y, w: 40, h: 40}));
}

function Rectangle({x, y, w, h, label, enabled}){
	this.x = x || 0;
	this.y = y || 0;
	this.w = w || 1;
	this.h = h || 1;

	this.enabled = enabled === false ? false : true;

	this.label = label || "";

	return this;
}

function checkIntersection(rect1, rect2){
	if((rect1.enabled && rect2.enabled) && rect1.x < rect2.x + rect2.w && rect2.x < rect1.x + rect1.w && rect1.y < rect2.y + rect2.h){
		return rect2.y < rect1.y + rect1.h;
	} else {
		return false;
	}
}