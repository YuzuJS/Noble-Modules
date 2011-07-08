module.declare(["./math"], function(require, exports, module) {
	var math = require("./math");
	var multiply = require("./math").multiply;

	exports.rectangle = function (l, w) { 
	 	return math.multiply(2, l) + math.multiply(2, w);
	};

	exports.square = function (s) {
		return math.multiply(4, s);
	};
})
