const Matter = require('matter-js');
const SETTINGS = require('../settings');
const Utils = require('../Utils');
const GameElement = require('./GameElement');

let Engine = Matter.Engine,
	Render = Matter.Render,
	World = Matter.World,
	Body = Matter.Body,
	Bodies = Matter.Bodies;

class Gate extends GameElement {
	constructor({x, y, defaultState, game}){
		super(Bodies.rectangle(x, y, SETTINGS.ELEMENT_SIZES.GATE, SETTINGS.ELEMENT_SIZES.GATE, { isSensor: true, isStatic: true }));
		this.body.elementType = "Gate";
		this.game = game;

		this.defaultState = defaultState;
		this.state = defaultState;

		// console.log(Utils.XYToTile(this.body.position));
	}

	activate(playersOnButton){
		// Getting the occurences of each player's team on the button
		const playerMap = Object.values(playersOnButton).reduce((acc, e) => acc.set(e.team, acc.get(e.team) + 1 || 1), new Map());
		// Getting the team with the most players on the button
		let strongestTeam = Array.from(playerMap.entries()).reduce((acc, val) => {
			return val[1] > acc[1] ? val : (val[1] === acc[1] ? [this.defaultState, val[1]] : acc);
		}, [this.defaultState, 0])[0];

		this.state = strongestTeam;
	}

	deactivate(playersOnButton){
		if(Object.keys(playersOnButton).length === 0) this.state = this.defaultState;
	}

	onActivePlayerTouch(player){
		if(player.team !== this.state && this.state !== SETTINGS.TEAM.NONE){
			this.game.respawnPlayer(player);
		}
	}

	sendable(){
		return {
			id: this.body.elementID,
			type: this.body.elementType,
			x: this.body.position.x,
			y: this.body.position.y,
			state: this.state
		}
	}
}

Math.sq = a => a * a;

Math.distance = function(x1, y1, x2, y2){
	return Math.sqrt(Math.sq(x2 - x1) + Math.sq(y2 - y1));
}

module.exports = Gate;