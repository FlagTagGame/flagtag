const Matter = require('matter-js');
const SETTINGS = require('../settings');
const Utils = require('../Utils');

let Engine = Matter.Engine,
	Render = Matter.Render,
	World = Matter.World,
	Body = Matter.Body,
	Bodies = Matter.Bodies;

class GameElement {
	constructor(body){
		this.id = Utils.makeID();
		this.body = body;

		this.isStatic = false;

		this.body.elementID = this.id;
		this.body.elementType = "GameElement";
	}

	activate(player){

	}

	deactivate(player){
		
	}

	onTick(){

	}

	onStartPlayerTouch(player){
		// console.log("epic");
	}

	onActivePlayerTouch(player){
		// console.log("epic");
	}

	onEndPlayerTouch(player){

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

module.exports = GameElement;