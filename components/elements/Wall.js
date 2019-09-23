const Matter = require('matter-js');
const SETTINGS = require('../settings');
const GameElement = require('./GameElement');

let Engine = Matter.Engine,
	Render = Matter.Render,
	World = Matter.World,
	Body = Matter.Body,
	Bodies = Matter.Bodies;

class Wall extends GameElement {
	constructor({x, y, type}){
		let xOrigin = 7;
		let yOrigin = 7;

		if(type === "full"){
			super(Bodies.rectangle(x, y, SETTINGS.tileSize, SETTINGS.tileSize, {
				isStatic: true
			}));
		} else if(type === "tl"){
			super(Bodies.fromVertices(x - xOrigin, y - yOrigin, [
				{x: 0, y: 0},
				{x: SETTINGS.tileSize, y: 0},
				{x: 0, y: SETTINGS.tileSize}
			], {
				isStatic: true
			}));
		} else if(type === "tr"){
			super(Bodies.fromVertices(x + xOrigin, y - yOrigin, [
				{x: SETTINGS.tileSize, y: 0},
				{x: 0, y: 0},
				{x: SETTINGS.tileSize, y: SETTINGS.tileSize}
			], {
				isStatic: true
			}));
		} else if(type === "bl"){
			super(Bodies.fromVertices(x - xOrigin, y + yOrigin, [
				{x: 0, y: 0},
				{x: 0, y: SETTINGS.tileSize},
				{x: SETTINGS.tileSize, y: SETTINGS.tileSize}
			], {
				isStatic: true
			}));
		} else if(type === "br"){
			super(Bodies.fromVertices(x + xOrigin, y + yOrigin, [
				{x: SETTINGS.tileSize, y: 0},
				{x: SETTINGS.tileSize, y: SETTINGS.tileSize},
				{x: 0, y: SETTINGS.tileSize}
			], {
				isStatic: true
			}));
		}

		this.wallType = type;

		this.body.elementType = "Wall";
		this.isStatic = true;
	}

	sendable(){
		return {
			id: this.body.elementID,
			type: this.body.elementType,
			x: this.body.position.x,
			y: this.body.position.y,
			wallType: this.wallType
		}
	}
}

module.exports = Wall;