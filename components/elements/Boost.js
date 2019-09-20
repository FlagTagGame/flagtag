const Matter = require('matter-js');
const SETTINGS = require('../settings');
const GameElement = require('./GameElement');

let Engine = Matter.Engine,
	Render = Matter.Render,
	World = Matter.World,
	Body = Matter.Body,
	Bodies = Matter.Bodies;

class Boost extends GameElement {
	constructor({x, y, team, game}){
		super(Bodies.circle(x, y, SETTINGS.ELEMENT_SIZES.SPIKE, { isSensor: true, isStatic: true }));
		this.body.elementType = "Boost";

		this.team = team;
		this.isOn = true;

		this.game = game;
	}

	onStartPlayerTouch(player){
		if(this.isOn) {
			if(player.team === this.team || this.team === SETTINGS.TEAM.NEUTRAL){
				this.isOn = false;

				let boostAngle = Math.atan2(player.body.velocity.y, player.body.velocity.x);

				Body.setVelocity(player.body, {x: Math.cos(boostAngle) * SETTINGS.GAME.BOOST_POWER, y: Math.sin(boostAngle) * SETTINGS.GAME.BOOST_POWER});

				// console.log(boostAngle, {x: Math.cos(boostAngle) * SETTINGS.GAME.BOOST_POWER, y: Math.sin(boostAngle) * SETTINGS.GAME.BOOST_POWER});

				setTimeout(() => {
					this.isOn = true;
				}, SETTINGS.GAME.BOOST_RESPAWN_TIME);
			}
		}
	}

	sendable(){
		return {
			id: this.body.elementID,
			type: this.body.elementType,
			x: this.body.position.x,
			y: this.body.position.y,
			team: this.team,
			isOn: this.isOn
		}
	}
}

module.exports = Boost;