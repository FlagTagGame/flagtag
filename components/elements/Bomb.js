const Matter = require('matter-js');
const SETTINGS = require('../settings');
const GameElement = require('./GameElement');

let Engine = Matter.Engine,
	Render = Matter.Render,
	World = Matter.World,
	Body = Matter.Body,
	Bodies = Matter.Bodies;

class Bomb extends GameElement {
	constructor({x, y, game}){
		super(Bodies.circle(x, y, SETTINGS.ELEMENT_SIZES.BOMB, { isSensor: true, isStatic: true }));
		this.body.elementType = "Bomb";
		this.isOn = true;

		this.game = game;
	}

	onStartPlayerTouch(player){
		if(this.isOn) {
			this.isOn = false;

			let bombAngle = Math.atan2(player.body.position.y - this.body.position.y, player.body.position.x - this.body.position.x);
			let distanceToBomb = Math.distance(player.body.position.x, player.body.position.y, this.body.position.x, this.body.position.y);

			let bombPower = (SETTINGS.GAME.BOMB_RANGE / distanceToBomb) * SETTINGS.GAME.BOMB_POWER;

			// console.log(bombAngle, bombPower, distanceToBomb, {x: Math.cos(bombAngle) * bombPower, y: Math.sin(bombAngle) * bombPower});

			// Need to applyForce asynchronously from this context
			setTimeout(() => {
				Body.applyForce(player.body, this.body.position, {x: Math.cos(bombAngle) * bombPower, y: Math.sin(bombAngle) * bombPower});
			}, 0);

			
			setTimeout(() => {
				this.isOn = true;
			}, SETTINGS.GAME.BOMB_RESPAWN_TIME);
		}
	}

	sendable(){
		return {
			id: this.body.elementID,
			type: this.body.elementType,
			x: this.body.position.x,
			y: this.body.position.y,
			isOn: this.isOn
		}
	}
}

Math.sq = a => a * a;

Math.distance = function(x1, y1, x2, y2){
	return Math.sqrt(Math.sq(x2 - x1) + Math.sq(y2 - y1));
}

module.exports = Bomb;