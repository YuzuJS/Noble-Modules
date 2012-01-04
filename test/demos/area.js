module.declare(["./math"], function (require, exports, module) {
    var math = require("./math");
    var multiply = require("./math").multiply;

    exports.rectangle = function rectangle(l, w) {
        return math.multiply(l, w);
    };

    exports.square = function (s) {
        return multiply(s, s);
    };
})
