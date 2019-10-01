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
		// Convert World Space position into Tile Space position
		let tileVector = Utils.XYToTile(this.body.position);

		// console.log("button", tileVector);

		this.isOn = false;

		this.game = game;

		// Grab the link data from the map JSON
		this.linkData = this.game.mapData.links[tileVector.x + "," + tileVector.y];

		// Calling asynchronously so the map is built before this is called
		setTimeout(() => {
			// Check if any link data was provided by the map JSON file.
			if(this.linkData){
				// Compile an array of elements that are linked to this button.
				this.linkedElements = this.linkData.tiles.map(tileString => {
					let tileArr = tileString.split(",");
					return Utils.getElementByTile(this.game.map, {x: Number(tileArr[0]), y: Number(tileArr[1])});
				}).filter(a => a);
			}
		}, 0);

		this.playersOnButton = {};

		// console.log(this.linkedElements);
	}

	onActivePlayerTouch(player){
		this.isOn = true;
		this.playersOnButton[player.id] = player;
		// Activate all links when touched
		this.linkedElements.forEach(element => {
			element.activate(this.playersOnButton);
		});
	}

	onEndPlayerTouch(player){
		delete this.playersOnButton[player.id];

		if(Object.keys(this.playersOnButton).length === 0) this.isOn = false;

		// Deactivate all links when touched
		this.linkedElements.forEach(element => {
			element.deactivate(this.playersOnButton);
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