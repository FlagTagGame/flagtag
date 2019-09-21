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
		BUTTON: 109
	}
};

let mapSprites = {
	floors: [],
	walls: {},
	flags: {},
	spikes: {},
	boosts: {},
	bombs: {},
	buttons: {}
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
	scene.load.spritesheet("boost", "/assets/boost.png", {frameWidth: 40, frameHeight: 40});
	scene.load.image("wall", "/assets/wall.png");
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
		key: 'boost_on',
		frames: scene.anims.generateFrameNumbers('boost', {start: 0, end: 3}),
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

		// Go through the 2d tile array to build the map
		map.mapData.tiles.forEach((tileRow, y) => {
			tileRow.forEach((tileID, x) => {
				let sprite = null;

				let xPos = (x * SETTINGS.tileSize) + (SETTINGS.tileSize / 2);
				let yPos = (y * SETTINGS.tileSize) + (SETTINGS.tileSize / 2);

				if(tileID === SETTINGS.TILE_IDS.FLOOR || tileID === SETTINGS.TILE_IDS.REDSPAWN || tileID === SETTINGS.TILE_IDS.BLUESPAWN){
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
				mapSprites.walls[element.id] = scene.add.image(xPos, yPos, "wall")
			} else if(element.type === "Flag"){
				let floorSprite = scene.add.image(xPos, yPos, "tiles");
				floorSprite.setFrame(CLIENT_SETTINGS.FRAMES.FLOOR);

				let flagSprite = scene.add.image(xPos, yPos, "tiles");
				flagSprite.setFrame(element.team === SETTINGS.TEAM.RED ? CLIENT_SETTINGS.FRAMES.REDFLAG : CLIENT_SETTINGS.FRAMES.BLUEFLAG);

				mapSprites.floors.push(floorSprite);
				mapSprites.flags[element.id] = flagSprite;
			} else if(element.type === "Spike"){
				let floorSprite = scene.add.image(xPos, yPos, "tiles");
				floorSprite.setFrame(CLIENT_SETTINGS.FRAMES.FLOOR);

				let spikeSprite = scene.add.image(xPos, yPos, "tiles");
				spikeSprite.setFrame(CLIENT_SETTINGS.FRAMES.SPIKE);

				mapSprites.floors.push(floorSprite);
				mapSprites.spikes[element.id] = spikeSprite;
			} else if(element.type === "Boost"){
				let floorSprite = scene.add.image(xPos, yPos, "tiles");
				floorSprite.setFrame(CLIENT_SETTINGS.FRAMES.FLOOR);

				let boostSprite = scene.add.sprite(xPos, yPos, "boost", 0);

				mapSprites.floors.push(floorSprite);
				mapSprites.boosts[element.id] = boostSprite;
			} else if(element.type === "Bomb"){
				let floorSprite = scene.add.image(xPos, yPos, "tiles");
				floorSprite.setFrame(CLIENT_SETTINGS.FRAMES.FLOOR);

				let bombSprite = scene.add.sprite(xPos, yPos, "tiles");
				bombSprite.setFrame(CLIENT_SETTINGS.FRAMES.BOMB_ON);

				mapSprites.floors.push(floorSprite);
				mapSprites.bombs[element.id] = bombSprite;
			} else if(element.type === "Button"){
				let floorSprite = scene.add.image(xPos, yPos, "tiles");
				floorSprite.setFrame(CLIENT_SETTINGS.FRAMES.FLOOR);

				let buttonSprite = scene.add.sprite(xPos, yPos, "tiles");
				buttonSprite.setFrame(CLIENT_SETTINGS.FRAMES.BUTTON);

				mapSprites.floors.push(floorSprite);
				mapSprites.buttons[element.id] = buttonSprite;
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

			// Set Ball Rotation
			playerSprites[playerID].setRotation(playerSprites[playerID].spriteBody.angle);

			// Show the flag is the player has it
			if(playerData.hasFlag) {
				playerSprites[playerID].flagSprite.setFrame(playerData.team === SETTINGS.TEAM.RED ? CLIENT_SETTINGS.FRAMES.BLUEFLAG : CLIENT_SETTINGS.FRAMES.REDFLAG);
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
		gameData = data;

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
				if(element.isOn) {
					mapSprites.boosts[element.id].anims.play("boost_on", true);
				} else {
					mapSprites.boosts[element.id].anims.stop("boost_on");
					mapSprites.boosts[element.id].setFrame(4);
				}
			} else if(element.type === "Bomb") {
				if(element.isOn) {
					mapSprites.bombs[element.id].setFrame(CLIENT_SETTINGS.FRAMES.BOMB_ON);
				} else {
					mapSprites.bombs[element.id].setFrame(CLIENT_SETTINGS.FRAMES.BOMB_OFF);
				}
			}
		});

		gameData.events.forEach(event => {
			if(event.type === SETTINGS.EVENTS.PLAYER_LEFT){
				let removedPlayerID = event.data;

				removePlayerSprite(removedPlayerID);
			}
		});
	});
}

function createPlayerSprite(playerData){
	let sprite = scene.add.sprite(0, 0, "tiles");
	sprite.setFrame(playerData.team === SETTINGS.TEAM.RED ? CLIENT_SETTINGS.FRAMES.REDBALL : CLIENT_SETTINGS.FRAMES.BLUEBALL);

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
	playerSprites[playerID].destroy();

	// Delete sprite from playerSprites
	delete playerSprites[playerID];

	return playerID;
}