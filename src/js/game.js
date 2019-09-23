let config = {
	type: Phaser.AUTO,
	width: 960,
	height: 540,
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
// Player's Sprites
let playerSprites = {};

// Shared Server and Client Settings, is set when player joins game.
let SETTINGS = {};

let TEAM_TO_NAME = {};
let POWERUP_TO_NAME = {};

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
		POWERUP_ROLLING_BOMB: 92,
		POWERUP_GRIP: 76
	}
};

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
	scene.load.spritesheet("tiles", "/assets/tiles.png", {frameWidth: 40, frameHeight: 40});
	scene.load.spritesheet("neutralboost", "/assets/boost.png", {frameWidth: 40, frameHeight: 40});
	scene.load.spritesheet("redboost", "/assets/redboost.png", {frameWidth: 40, frameHeight: 40});
	scene.load.spritesheet("blueboost", "/assets/blueboost.png", {frameWidth: 40, frameHeight: 40});
	scene.load.spritesheet("portal", "/assets/portal.png", {frameWidth: 40, frameHeight: 40});
	scene.load.spritesheet("powerups", "/assets/powerups.png", {frameWidth: 40, frameHeight: 40});
	scene.load.spritesheet("splats", "/assets/splats.png", {frameWidth: 120, frameHeight: 120});
	scene.load.spritesheet("walls", "/assets/walls.png", {frameWidth: 40, frameHeight: 40});
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

	// Join a Game
	// Callback is called on success
	socket.emit("join game", (newPlayerID, map, newSETTINGS) => {
		// Store Shared Settings
		SETTINGS = newSETTINGS;
		// Store Client's player ID
		clientPlayerID = newPlayerID;

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
		map.mapData.tiles.forEach((tileRow, y) => {
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
		map.elements.forEach(element => {
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
	// Check if the clients sprite exists.
	if(playerSprites[clientPlayerID]){
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

			// Set Flag Position
			playerSprites[playerID].flagSprite.x = playerSprites[playerID].x + (SETTINGS.tileSize / 2.5);
			playerSprites[playerID].flagSprite.y = playerSprites[playerID].y - (SETTINGS.tileSize / 2.5);

			// Set Powerup Positions
			Object.keys(playerSprites[playerID].powerupSprites).forEach(key => {
				playerSprites[playerID].powerupSprites[key].setPosition(playerSprites[playerID].x, playerSprites[playerID].y);
			});

			Object.keys(playerData.powerups).forEach(key => {
				playerSprites[playerID].powerupSprites[POWERUP_TO_NAME[key].toLowerCase()].setVisible(playerData.powerups[key] && !playerData.dead);
			});

			// Set Ball Rotation
			playerSprites[playerID].setRotation(playerSprites[playerID].spriteBody.angle);

			// Show the flag is the player has it
			if(playerData.hasFlag) {
				// Set Frame to flag frame of players team
				playerSprites[playerID].flagSprite.setFrame(
					CLIENT_SETTINGS.FRAMES[TEAM_TO_NAME[playerData.team === SETTINGS.TEAM.RED ? SETTINGS.TEAM.BLUE : SETTINGS.TEAM.RED] + "FLAG"]
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
	socket.on("world data", data => {
		gameData = msgpack.deserialize(data);

		// Iterate through the player data's and update the cleint side prediction bodies.
		Object.keys(gameData.players).forEach(playerID => {
			let playerData = gameData.players[playerID];

			if(playerSprites[playerID]) {
				Body.setPosition(playerSprites[playerID].spriteBody, {x: playerData.x, y: playerData.y});
				Body.setVelocity(playerSprites[playerID].spriteBody, {x: playerData.xVelocity * 0.6, y: playerData.yVelocity * 0.6});
				Body.setAngle(playerSprites[playerID].spriteBody, playerData.rotation);
			} else {
				playerSprites[playerID] = createPlayerSprite(playerData);
			}
		});

		// Update the game elements.
		gameData.elements.forEach(element => {
			if(element.type === "Flag") {
				mapSprites.flags[element.id].setAlpha(element.taken ? 0.4 : 1);
			} else if(element.type === "Boost") {
				// Play Boost Animation if its on
				if(element.isOn) {
					mapSprites.boosts[element.id].anims.play(TEAM_TO_NAME[element.team].toLowerCase() + "boost_on", true);
				} else {
					// Stop the animation if the boost is off
					mapSprites.boosts[element.id].anims.stop(TEAM_TO_NAME[element.team].toLowerCase() + "boost_on");
					mapSprites.boosts[element.id].setFrame(4);
				}
			} else if(element.type === "Bomb") {
				if(element.isOn) {
					mapSprites.bombs[element.id].setFrame(CLIENT_SETTINGS.FRAMES.BOMB_ON);
				} else {
					mapSprites.bombs[element.id].setFrame(CLIENT_SETTINGS.FRAMES.BOMB_OFF);
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
			}
		});

		// Update game events
		gameData.events.forEach(event => {
			let eventType = event[0];
			let eventData = event[1];

			if(eventType === SETTINGS.EVENTS.PLAYER_LEFT){
				let removedPlayerID = eventData;

				removePlayerSprite(removedPlayerID);
			} else if(eventType === SETTINGS.EVENTS.PLAYER_POPPED){
				let poppedPlayerID = eventData;

				effectSprites.splats[poppedPlayerID] = scene.add.image(playerSprites[poppedPlayerID].x, playerSprites[poppedPlayerID].y, "splats", gameData.players[poppedPlayerID].team === SETTINGS.TEAM.RED ? getRandomInt(0, 7) : getRandomInt(7, 13));
			}
		});
	});
}

function createPlayerSprite(playerData){
	let sprite = scene.add.sprite(0, 0, "tiles");
	sprite.setFrame(CLIENT_SETTINGS.FRAMES[TEAM_TO_NAME[playerData.team] + "BALL"]);

	sprite.spriteBody = Bodies.circle(0, 0, SETTINGS.BALL.SIZE, {
		friction: SETTINGS.BALL.FRICTION,
		frictionAir: SETTINGS.BALL.AIR_FRICTION,
		density: SETTINGS.BALL.DENSITY,
		restitution: SETTINGS.BALL.BOUNCINESS
	});

	World.add(engine.world, sprite.spriteBody);

	sprite.flagSprite = scene.add.sprite(0, 0, "tiles");
	sprite.flagSprite.setFrame(CLIENT_SETTINGS.FRAMES.REDFLAG);
	sprite.flagSprite.setVisible(false);

	sprite.powerupSprites = {};
	sprite.powerupSprites.forcefield = scene.add.sprite(0, 0, "powerups");
	sprite.powerupSprites.forcefield.setFrame(0);
	sprite.powerupSprites.forcefield.setVisible(false);

	sprite.powerupSprites.rolling_bomb = scene.add.sprite(0, 0, "powerups");
	sprite.powerupSprites.rolling_bomb.setFrame(1);
	sprite.powerupSprites.rolling_bomb.setVisible(false);

	sprite.powerupSprites.grip = scene.add.sprite(0, 0, "powerups");
	sprite.powerupSprites.grip.setFrame(2);
	sprite.powerupSprites.grip.setVisible(false);

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