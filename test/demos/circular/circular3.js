module.declare(["./circular1"], function (require, exports, module) {
    var circular3 = require("./circular1");

    exports.getValue = function () {
        return "3";
    };

    exports.getValueFrom1 = function () {
        return circular1.getValue();
    };
})
