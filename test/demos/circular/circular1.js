module.declare(["./circular2"], function (require, exports, module) {
    var circular2 = require("./circular2");

    exports.getValue = function () {
        return "1";
    };

    exports.getValueFrom2 = function () {
        return circular2.getValue();
    };
})
