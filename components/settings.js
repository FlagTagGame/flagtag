const SETTINGS = {
	gameWidth: 800,
	gameHeight: 600,
	tileSize: 40,
	tickSpeed: 30,
	socketTickSpeed: 20,
	GAME: {
		RESPAWN_TIME: 3000,
		BOOST_POWER: 20,
		BOOST_RESPAWN_TIME: 5000,
		FC_INVINCIBLE_TIME: 250
	},
	BALL: {
		SIZE: 19,
		ACCELERATION: 0.00023,
		DENSITY: 0.002,
		BOUNCINESS: 0.22,
		TOP_VELOCITY: 20
	},
	TEAM: {
		RED: 1,
		BLUE: 2,
		NEUTRAL: 3
	},
	TILE_IDS: {
		BACKGROUND: 0,
		FLOOR: 1,
		WALL: 2,
		REDFLAG: 3.1,
		BLUEFLAG: 3.2,
		REDSPAWN: 4.1,
		BLUESPAWN: 4.2,
		SPIKE: 5,
		BOOST: 6
	},
	ELEMENT_SIZES: {
		FLAG: 15,
		SPIKE: 14
	}
};

module.exports = SETTINGS;