newTestSet("Global objects");

test("require: cannot mess with", function () {
    assertNotWritable(function () { return window.require; }, function () { window.require = "blah"; }, "Global require");
    assertNotConfigurable(function () { return window.require; }, function () { delete window.require; }, "Global require");
    assertNotExtensible(window.require, "Global require");
});

test("module: cannot mess with", function () {
    assertNotWritable(function () { return window.module; }, function () { window.module = "blah"; }, "Global module");
    assertNotConfigurable(function () { return window.module; }, function () { delete window.module; }, "Global module");
});

test("module.main: basic functionality", function () {
    var mainModule;

    window.module.declare([], function (require, exports, module) {
        ok(true, "Factory function passed to global module.declare was invoked");

        mainModule = exports;

        exports.print = function (str) {
            console.log(str);
        };
    })

    strictEqual(window.module.main, mainModule, "Global main module is the one we just declared");
    strictEqual(typeof window.module.main.print, "function", "Global main module exported the print function");
});

asyncTest("module.main: with dependencies", function () {
    var mainModule;

    window.module.declare(["demos/math"], function (require, exports, module) {
        ok(true, "Factory function passed to global module.declare was invoked");

        var math = require("demos/math");
        strictEqual(typeof math.add, "function", "Global main module imported the demos/math module's add function");

        start();
    });
});