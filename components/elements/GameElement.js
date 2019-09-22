const Matter = require('matter-js');
const SETTINGS = require('../settings');
const Utils = require('../Utils');

let Engine = Matter.Engine,
	Render = Matter.Render,
	World = Matter.World,
	Body = Matter.Body,
	Bodies = Matter.Bodies;

/**
 * This is the core GameElement that all other elements extend from.
 */
class GameElement {
	constructor(body){
		// Element ID
		this.id = Utils.makeID();
		// Matter.js Physics Body
		this.body = body;

		// Elements that are static don't send any updates to players (walls, spikes, etc)
		this.isStatic = false;

		// Element ID attached to body so that the element it belongs to can be found.
		this.body.elementID = this.id;
		// Element Type is atttached to the body to figure out what kind of body it is.
		this.body.elementType = "GameElement";
	}

	/**
	 * A callback thats called when a button linked to this element is being actively touched
	 * @param  {Object} playersOnButton An Object of players that are on the button
	 * @return {undefined}              Doesn't return anything.
	 */
	activate(playersOnButton){

	}

	/**
	 * A callback thats called when a button linked to this element is untouched
	 * @param  {Object} playersOnButton An Object of players that are on the button
	 * @return {undefined}              Doesn't return anything.
	 */
	deactivate(playersOnButton){
		
	}

	/**
	 * A callback thats called before any engine update
	 * @return {undefined} Doesn't return anything.
	 */
	onTick(){

	}

	/**
	 * A callback thats called once when the player touches this element
	 * @param  {[type]} player The player in question
	 * @return {undefined}     Doesn't return anything.
	 */
	onStartPlayerTouch(player){
		// console.log("epic");
	}

	/**
	 * A callback thats called while a player touches this element
	 * @param  {[type]} player The player in question
	 * @return {undefined}     Doesn't return anything.
	 */
	onActivePlayerTouch(player){
		// console.log("epic");
	}

	/**
	 * A callback thats called when a player stops touching this element
	 * @param  {[type]} player The player in question
	 * @return {undefined}     Doesn't return anything.
	 */
	onEndPlayerTouch(player){

	}

	/**
	 * Creates an object thats sendable through socket.io
	 * @return {Object} Sendable Object
	 */
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