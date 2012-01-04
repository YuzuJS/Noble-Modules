module.declare(["./circularA"], function (require, exports, module) {
    var circularA = require("./circularA");

    exports.getValue = function () {
        return "b";
    };

    exports.getValueFromA = function () {
        return circularA.getValue();
    };
})
