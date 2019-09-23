const Matter = require('matter-js');
const _ = require('lodash');
const SETTINGS = require('../settings');
const GameElement = require('./GameElement');

let Engine = Matter.Engine,
	Render = Matter.Render,
	World = Matter.World,
	Body = Matter.Body,
	Bodies = Matter.Bodies;

class Powerup extends GameElement {
	constructor({x, y, game}){
		super(Bodies.circle(x, y, SETTINGS.ELEMENT_SIZES.POWERUP, { isSensor: true, isStatic: true }));
		this.body.elementType = "Powerup";
		this.isOn = true;
		this.powerupType = _.random(1, 3);

		this.game = game;
	}

	onStartPlayerTouch(player){
		if(this.isOn){
			this.isOn = false;

			let chosenPowerUp = Number(this.powerupType);

			player.powerups[chosenPowerUp] = SETTINGS.GAME.POWERUP_LIFETIME;
			this.powerupType = _.random(1, 3);

			setTimeout(() => {
				this.isOn = true;
			}, SETTINGS.GAME.POWERUP_RESPAWN_TIME);
		}
	}

	sendable(){
		return {
			id: this.body.elementID,
			type: this.body.elementType,
			x: this.body.position.x,
			y: this.body.position.y,
			isOn: this.isOn,
			powerupType: this.powerupType
		}
	}
}

module.exports = Powerup;