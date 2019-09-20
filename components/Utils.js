let Utils = {};

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