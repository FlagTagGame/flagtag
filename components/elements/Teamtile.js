const Matter = require('matter-js');
const SETTINGS = require('../settings');
const GameElement = require('./GameElement');

let Engine = Matter.Engine,
	Render = Matter.Render,
	World = Matter.World,
	Body = Matter.Body,
	Bodies = Matter.Bodies;

class Teamtile extends GameElement {
	constructor({x, y, team, game}){
		super(Bodies.rectangle(x, y, SETTINGS.ELEMENT_SIZES.FLOOR, SETTINGS.ELEMENT_SIZES.FLOOR, { isSensor: true, isStatic: true }));
		this.body.elementType = "Teamtile";
		this.isStatic = true;

		this.team = team;

		this.game = game;
	}

	onActivePlayerTouch(player){
		if((player.team === this.team || this.team === SETTINGS.TEAM.NEUTRAL) && !player.hasFlag) {
			player.body.frictionAir = SETTINGS.GAME.TEAMTILE_AIR_FRICTION;
			player.onTeamtile = true;
		}
	}

	onEndPlayerTouch(player){
		if((player.team === this.team || this.team === SETTINGS.TEAM.NEUTRAL) && !player.hasFlag) {
			player.body.frictionAir = SETTINGS.BALL.AIR_FRICTION;
			player.onTeamtile = false;
		}
	}

	sendable(){
		return {
			id: this.body.elementID,
			type: this.body.elementType,
			x: this.body.position.x,
			y: this.body.position.y,
			team: this.team
		}
	}
}

module.exports = Teamtile;