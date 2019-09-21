const Matter = require('matter-js');
const SETTINGS = require('../settings');
const Utils = require('../Utils');
const GameElement = require('./GameElement');

let Engine = Matter.Engine,
	Render = Matter.Render,
	World = Matter.World,
	Body = Matter.Body,
	Bodies = Matter.Bodies;

class Button extends GameElement {
	constructor({x, y, game}){
		super(Bodies.circle(x, y, SETTINGS.ELEMENT_SIZES.BUTTON, { isSensor: true, isStatic: true }));
		this.body.elementType = "Button";
		let tileVector = Utils.XYToTile(this.body.position);

		this.isOn = true;

		this.game = game;

		this.linkData = this.game.mapData.links[tileVector.x + "," + tileVector.y];

		// Calling asynchronously so the map is built before this is called
		setTimeout(() => {
			if(this.linkData){
				this.linkedElements = this.linkData.tiles.map(tileString => {
					let tileArr = tileString.split(",");
					return Utils.getElementByTile(this.game.map, {x: Number(tileArr[0]), y: Number(tileArr[1])});
				}).filter(a => a);
			}
		}, 0);

		// console.log(this.linkedElements);
	}

	onStartPlayerTouch(player){
		this.linkedElements.forEach(element => {
			element.activate();
		});
	}

	onEndPlayerTouch(player){
		this.linkedElements.forEach(element => {
			element.deactivate();
		});
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

module.exports = Button;