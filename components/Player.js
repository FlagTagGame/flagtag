const Utils = require('./Utils');

class Player {
	constructor({name, team, body, game, socket}){
		this.id = Utils.makeID();
		this.name = name || "Odd Ball";
		this.team = team;
		this.hasFlag = false;
		this.dead = false;
		this.invincible = false;
		this.isPortaling = false;
		this.onTeamtile = false;

		this.powerups = {
			1: 0,
			2: 0,
			3: 0
		};

		this.body = body;
		this.socket = socket;
		this.game = game;

		this.input = {
			left: false,
			right: false,
			up: false,
			down: false
		};
	}

	die(){
		this.dead = true;
		this.body.isSensor = true;
	}

	live(){
		this.dead = false;
		this.body.isSensor = false;
	}

	handleInput(input){
		let inputObj = {
			left: Boolean(input.left),
			right: Boolean(input.right),
			up: Boolean(input.up),
			down: Boolean(input.down)
		};

		this.input = inputObj;

		return this.input;
	}

	sendable(){
		return {
			id: this.id,
			name: this.name,
			x: Math.floor(this.body.position.x),
			y: Math.floor(this.body.position.y),
			xV: this.body.velocity.x,
			yV: this.body.velocity.y,
			r: this.body.angle,
			t: this.team,
			hF: this.hasFlag,
			dead: this.dead,
			pups: `${this.powerups[1] ? 1 : 0}${this.powerups[2] ? 1 : 0}${this.powerups[3] ? 1 : 0}`
		};
		// return [
		// 	this.id,
		// 	this.name,
		// 	this.body.position.x,
		// 	this.body.position.y,
		// 	this.body.velocity.x,
		// 	this.body.velocity.y,
		// 	this.body.angle,
		// 	this.team,
		// 	this.hasFlag,
		// 	this.dead,
		// 	this.powerups
		// ];
	}
}

module.exports = Player;