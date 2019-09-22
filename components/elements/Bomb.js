const Matter = require('matter-js');
const SETTINGS = require('../settings');
const Utils = require('../Utils');
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

	activate(playersOnButton){
		if(this.isOn) {
			this.isOn = false;

			this.game.createExplosion(this.body.position, SETTINGS.GAME.BOMB_RANGE, SETTINGS.GAME.BOMB_POWER);

			setTimeout(() => {
				this.isOn = true;
			}, SETTINGS.GAME.BOMB_RESPAWN_TIME);
		}
	}

	onStartPlayerTouch(playersOnButton){
		this.activate(playersOnButton);
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