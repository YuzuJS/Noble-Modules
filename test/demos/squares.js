module.declare(function (require, exports, module) {
    var area = require("./area");
    var squarePerimeter = require       (  './perimeter').square;

    // var commentedOut = require("./diamond/bottom");
    /* var noGoodEither = require("./diamond/bottom"); */

    exports.area = area.square;
    exports.perimeter = squarePerimeter;
})
