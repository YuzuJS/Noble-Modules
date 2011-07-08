module.declare([], function (require, exports, module) {
	exports.forceChoke = function (target, onChoked) {
		module.load("demos/theForce", function onModuleLoaded() {
			target.degreeChoked = require("demos/theForce").getDarkSidePower();
			onChoked();
		});
	};
})
