module.declare(["./circular3"], function (require, exports, module) {
    var circular3 = require("./circular3");

    exports.getValue = function () {
        return "2";
    };

    exports.getValueFrom3 = function () {
        return circular3.getValue();
    };
})
