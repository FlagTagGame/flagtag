const Utils = require('./Utils');

class Player {
	constructor({name, team, body, game, socket}){
		this.id = Utils.makeID();
		this.name = name || "Odd Ball";
		this.team = team;
		this.hasFlag = false;
		this.dead = false;
		this.invincible = false;

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
			x: this.body.position.x,
			y: this.body.position.y,
			xVelocity: this.body.velocity.x,
			yVelocity: this.body.velocity.y,
			rotation: this.body.angle,
			team: this.team,
			hasFlag: this.hasFlag,
			dead: this.dead
		};
	}
}

module.exports = Player;