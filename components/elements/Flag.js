const Matter = require('matter-js');
const SETTINGS = require('../settings');
const GameElement = require('./GameElement');

let Engine = Matter.Engine,
	Render = Matter.Render,
	World = Matter.World,
	Body = Matter.Body,
	Bodies = Matter.Bodies;

class Flag extends GameElement {
	constructor({x, y, team, game}){
		super(Bodies.circle(x, y, SETTINGS.ELEMENT_SIZES.FLAG, { isSensor: true, isStatic: true }));
		this.body.elementType = "Flag";

		this.game = game;
		this.team = team;
		this.taken = false;
	}

	onActivePlayerTouch(player){
		if(this.taken) {

		} else {
			if(player.hasFlag) {
				// Is player the same color as flag
				if(player.team === this.team) {
					this.game.returnFlag(player);

					if(this.team === SETTINGS.TEAM.RED) this.game.score.red++; else if(this.team === SETTINGS.TEAM.BLUE) this.game.score.blue++;
				}
			} else {
				if(player.team !== this.team) {
					this.taken = true;
					player.hasFlag = this.body.elementID;

					player.invincible = true;
					setTimeout(() => {
						player.invincible = false;
					}, SETTINGS.GAME.FC_INVINCIBLE_TIME);
				}
			}
		}
	}

	sendable(){
		return {
			id: this.body.elementID,
			type: this.body.elementType,
			x: this.body.position.x,
			y: this.body.position.y,
			taken: this.taken,
			team: this.team
		}
	}
}

module.exports = Flag;