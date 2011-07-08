module.declare([], function (require, exports, module) {
	exports.getDarkSidePower = function () {
		return Math.random();
	};

	exports.getLightSidePower = function () {
		return Math.random() / 2; // The light side is weaker, obviously.
	};
})
