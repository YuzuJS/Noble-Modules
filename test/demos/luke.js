module.declare([], function (require, exports, module) {
	exports.forcePush = function (target, onPushed) {
		module.load("./theForce", function onModuleLoaded() {
			target.degreePushed = require("./theForce").getLightSidePower();
			onPushed();
		});
	};
})
