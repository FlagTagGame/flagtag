const Matter = require('matter-js');
const SETTINGS = require('../settings');
const Utils = require('../Utils');
const GameElement = require('./GameElement');

let Engine = Matter.Engine,
	Render = Matter.Render,
	World = Matter.World,
	Body = Matter.Body,
	Bodies = Matter.Bodies;

class Portal extends GameElement {
	constructor({x, y, game}){
		super(Bodies.circle(x, y, SETTINGS.ELEMENT_SIZES.PORTAL, { isSensor: true, isStatic: true }));
		this.body.elementType = "Portal";
		// Convert World Space position into Tile Space position
		let tileVector = Utils.XYToTile(this.body.position);

		// console.log("portal", tileVector);

		this.isOn = true;
		this.cooldown = 0;

		this.game = game;

		// Grab the link data from the map JSON
		this.linkData = this.game.mapData.links[tileVector.x + "," + tileVector.y];

		// Calling asynchronously so the map is built before this is called
		setTimeout(() => {
			// Check if any link data was provided by the map JSON file.
			if(this.linkData){
				this.cooldown = Number(this.linkData.cooldown) || 0;

				// Compile an array of elements that are linked to this portal.
				this.linkedElements = this.linkData.tiles.map(tileString => {
					let tileArr = tileString.split(",");
					let element = Utils.getElementByTile(this.game.map, {x: Number(tileArr[0]), y: Number(tileArr[1])});

					if(element){
						return element.body.elementType === "Portal" ? element : false;
					} else return false;
				}).filter(a => a);
			} else {
				this.isOn = false;
			}
		}, 0);

		// console.log(this.linkedElements);
	}

	onStartPlayerTouch(player){
		if(this.isOn && !player.isPortaling) {
			this.isOn = false;
			player.isPortaling = true;

			if(this.linkedElements[0]) Body.setPosition(player.body, this.linkedElements[0].body.position);
			
			setTimeout(() => {
				this.isOn = true;
			}, this.cooldown);
		}
	}

	onEndPlayerTouch(player){
		player.isPortaling = false;
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

module.exports = Portal;