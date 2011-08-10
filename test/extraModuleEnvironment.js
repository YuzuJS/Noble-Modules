newTestSet("Extra-module environment");

test("require: disallows replacement, deletion, or extension", function () {
    assertNotWritable(function () { return require; }, function () { require = "blah"; }, "Global require");
    assertNotConfigurable(function () { return require; }, function () { delete require; }, "Global require");
    assertNotExtensible(require, "Global require");
});

test("module: disallows replacement or deletion", function () {
    assertNotWritable(function () { return module; }, function () { module = "blah"; }, "Global module");
    assertNotConfigurable(function () { return module; }, function () { delete module; }, "Global module");
});

asyncTest("module.main: declaring a main module properly sets module.main", function () {
    var mainModule;

    module.declare([], function (require, exports, module) {
        ok(true, "Factory function passed to global module.declare was invoked");

        mainModule = exports;

        exports.print = function (str) {
            console.log(str);
        };

        setTimeout(function () {
            strictEqual(module.main, mainModule, "Global main module is the one we just declared");
            strictEqual(typeof module.main.print, "function", "Global main module exported the print function");

            start();
        }, 0);
    })
});

asyncTest("module.main: declaring a main module properly provides its dependencies", function () {
    var mainModule;

    module.declare(["demos/math"], function (require, exports, module) {
        ok(true, "Factory function passed to global module.declare was invoked");

        var math = require("demos/math");
        strictEqual(typeof math.add, "function", "Global main module imported the demos/math module's add function");

        deepEqual(module.dependencies, ["demos/math"], "The dependencies array for the main module contains the demos/math module");

        start();
    });
});

test("module.id: is undefined", function () {
    strictEqual(module.id, undefined, "The id property is undefined for the global module object");
});

test("module.id: is not modified by declaration of the main module", function () {
    module.declare([], function () { });

    deepEqual(module.id, undefined, "The id property is still undefined for the global module object");
});

// See http://groups.google.com/group/commonjs/browse_thread/thread/50d4565bd07e03cb
test("module.dependencies: is an empty array", function () {
    deepEqual(module.dependencies, [], "The dependencies property is an empty array for the global module object");
});

test("module.dependencies: is not modified by declaration of the main module", function () {
    module.declare(["demos/math"], function () { });

    deepEqual(module.dependencies, [], "The dependencies property is still an empty array for the global module object");
});