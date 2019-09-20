let config = {
	type: Phaser.AUTO,
	width: 800,
	height: 600,
	scene: {
		preload: preload,
		create: create,
		update: update
	}
};

let Engine = Matter.Engine,
	Body = Matter.Body,
	World = Matter.World,
	Bodies = Matter.Bodies;

let socket = io("/game");
let clientPlayerID;
let game = new Phaser.Game(config);
let scene;

let controls;

let gameData = {};
let playerSprites = {};

let SETTINGS = {};

let CLIENT_SETTINGS = {
	FRAMES: {
		FLOOR: 77,
		WALL: -1,
		REDFLAG: 30,
		BLUEFLAG: 31,
		REDBALL: 14,
		BLUEBALL: 15,
		SPIKE: 12
	}
};

let mapSprites = {
	floors: [],
	walls: {},
	flags: {},
	spikes: {},
	boosts: {}
};

let engine = Engine.create();
engine.world.gravity.scale = 0;

function preload(){
	scene = this;

	scene.load.spritesheet("tiles", "/assets/tiles.png", {frameWidth: 40, frameHeight: 40});
	scene.load.spritesheet("boost", "/assets/boost.png", {frameWidth: 40, frameHeight: 40});
	scene.load.image("wall", "/assets/wall.png");
}

function create(){
	scene = this;

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

	Object.keys(controls).forEach(key => {
		scene.input.keyboard.removeCapture(controls[key].keyCode);
	});

	scene.anims.create({
		key: 'boost_on',
		frames: scene.anims.generateFrameNumbers('boost', {start: 0, end: 3}),
		frameRate: 10,
		repeat: -1
	});

	socket.emit("join game", (newPlayerID, map, newSETTINGS) => {
		SETTINGS = newSETTINGS;
		clientPlayerID = newPlayerID;

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
			}
		});

		socketHandler();
	});
}

function update(){
	if(playerSprites[clientPlayerID]){
		// Refer to "input" key in settings.js
		let inputObj = {
			up: controls.up.isDown || controls.up2.isDown,
			down: controls.down.isDown || controls.down2.isDown,
			left: controls.left.isDown || controls.left2.isDown,
			right: controls.right.isDown || controls.right2.isDown,
		};

		socket.emit("input", inputObj);
	}

	Object.keys(playerSprites).forEach(playerID => {
		let playerData = gameData.players[playerID];

		if(playerSprites[playerID]) {
			playerSprites[playerID].x = playerSprites[playerID].body.position.x;
			playerSprites[playerID].y = playerSprites[playerID].body.position.y;

			playerSprites[playerID].setVisible(!playerData.dead);

			playerSprites[playerID].flagSprite.x = playerSprites[playerID].x + (SETTINGS.tileSize / 2.5);
			playerSprites[playerID].flagSprite.y = playerSprites[playerID].y - (SETTINGS.tileSize / 2.5);

			playerSprites[playerID].setRotation(playerSprites[playerID].body.angle);

			if(playerData.hasFlag) {
				playerSprites[playerID].flagSprite.setFrame(playerData.team === SETTINGS.TEAM.RED ? CLIENT_SETTINGS.FRAMES.BLUEFLAG : CLIENT_SETTINGS.FRAMES.REDFLAG);
				playerSprites[playerID].flagSprite.setVisible(true);
			} else {
				playerSprites[playerID].flagSprite.setVisible(false);
			}
		} else {
			playerSprites[playerID] = createPlayerSprite(playerData);
		}
	});

	Engine.update(engine, 1000 / 60);
}

function socketHandler(){
	socket.on("world data", data => {
		gameData = data;

		Object.keys(gameData.players).forEach(playerID => {
			let playerData = gameData.players[playerID];

			if(playerSprites[playerID]) {
				Body.setPosition(playerSprites[playerID].body, {x: playerData.x, y: playerData.y});
				Body.setVelocity(playerSprites[playerID].body, {x: playerData.xVelocity * 0.6, y: playerData.yVelocity * 0.6});
				Body.setAngle(playerSprites[playerID].body, playerData.rotation);
			} else {
				playerSprites[playerID] = createPlayerSprite(playerData);
			}
		});

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
			}
		});
	});
}

function createPlayerSprite(playerData){
	let sprite = scene.add.sprite(0, 0, "tiles");
	sprite.setFrame(playerData.team === SETTINGS.TEAM.RED ? CLIENT_SETTINGS.FRAMES.REDBALL : CLIENT_SETTINGS.FRAMES.BLUEBALL);

	sprite.body = Bodies.circle(0, 0, SETTINGS.BALL.SIZE);

	World.add(engine.world, sprite.body);

	sprite.flagSprite = scene.add.sprite(0, 0, "tiles");
	sprite.flagSprite.setFrame(CLIENT_SETTINGS.FRAMES.REDFLAG);
	sprite.flagSprite.setVisible(false);

	if(playerData.id === clientPlayerID){
		scene.cameras.main.startFollow(sprite);
	}

	return sprite;
}