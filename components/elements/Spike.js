const Matter = require('matter-js');
const SETTINGS = require('../settings');
const GameElement = require('./GameElement');

let Engine = Matter.Engine,
	Render = Matter.Render,
	World = Matter.World,
	Body = Matter.Body,
	Bodies = Matter.Bodies;

class Spike extends GameElement {
	constructor({x, y, game}){
		super(Bodies.circle(x, y, SETTINGS.ELEMENT_SIZES.SPIKE, { isSensor: true, isStatic: true }));
		this.body.elementType = "Spike";
		this.isStatic = true;

		this.game = game;
	}

	onActivePlayerTouch(player){
		this.game.respawnPlayer(player);
	}

	sendable(){
		return {
			id: this.body.elementID,
			type: this.body.elementType,
			x: this.body.position.x,
			y: this.body.position.y
		}
	}
}

module.exports = Spike;