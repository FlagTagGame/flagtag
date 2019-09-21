const Matter = require('matter-js');
const SETTINGS = require('../settings');
const GameElement = require('./GameElement');

let Engine = Matter.Engine,
	Render = Matter.Render,
	World = Matter.World,
	Body = Matter.Body,
	Bodies = Matter.Bodies;

class Wall extends GameElement {
	constructor({x, y}){
		super(Bodies.rectangle(x, y, SETTINGS.tileSize, SETTINGS.tileSize, {
			isStatic: true
		}));
		this.body.elementType = "Wall";
		this.isStatic = true;
	}
}

module.exports = Wall;