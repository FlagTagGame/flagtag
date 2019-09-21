let SETTINGS = require('./settings');

let Utils = {};

Utils.TileToXY = (tileVector) => {
	return {x: (tileVector.x * SETTINGS.tileSize) + (SETTINGS.tileSize / 2), y: (tileVector.y * SETTINGS.tileSize) + (SETTINGS.tileSize / 2)};
};

Utils.XYToTile = (worldVector) => {
	return {x: Math.floor(worldVector.x / SETTINGS.tileSize), y: Math.floor(worldVector.y / SETTINGS.tileSize)};
};

Utils.getElementByTile = (elements, tileVector) => {
	let foundElement = false;

	let worldVector = Utils.TileToXY(tileVector);

	for (let i = elements.length - 1; i >= 0; i--) {
		// if(!elements[i].isStatic) console.log(worldVector, elements[i].sendable());
		if(elements[i].body.position.x === worldVector.x && elements[i].body.position.y === worldVector.y) {
			foundElement = elements[i];
			break;
		}
	}

	return foundElement;
};

Utils.callAtInterval = (speed, maxCalls, func) => {
	return new Promise((resolve, reject) => {
		let calls = 0;
		let intervalID;
		intervalID = setInterval(() => {
			calls++;
			if(calls > maxCalls) {
				resolve();
				clearInterval(intervalID);
			} else func(calls);
		}, speed);
	});
}

Utils.decodeMessengerPack = (data, key) => {
	return key.reduce((acc, val, idx) => {
		acc[val] = data[idx];
		return acc;
	}, {});
};

Utils.makeID = (length) => {
	return '_' + Math.random().toString(36).substr(2, (length || 7) + 2);
}

module.exports = Utils;