module.declare(function (require, exports, module) {
    var add = require("./math").add;
    var multiply = require("./math").multiply;

    exports.area = function (r) {
        return Math.PI * multiply(r, r);
    };
    exports.perimeter = function (r) {
        return multiply(add(1, 1), Math.PI) * r;
    };
})
