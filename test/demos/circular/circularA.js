module.declare(["./circularB"], function (require, exports, module) {
	var circularA = require("./circularB");

	exports.getValue = function () {
		return "a";
	};

	exports.getValueFromB = function () {
		return circularB.getValue();
	};
})
