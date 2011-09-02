newTestSet("module namespace");

asyncTest("declare: accepts labeled dependency objects and correctly provides them to factory function's require", function () {
    module.declare([{ mathLabel: "demos/math" }], function (require, exports, module) {
        strictEqual(require.id("mathLabel"), "demos/math", "The label was translated into the correct ID when using require.id");
        strictEqual(require.uri("mathLabel"), "demos/math.js", "The label was translated into the correct URI when using require.uri");

        var math = require("mathLabel");
        strictEqual(typeof math, "object", 'demos/math module, labeled as "mathLabel," has been provided');
        strictEqual(typeof math.add, "function", 'demos/math module, labeled as "mathLabel," has exported its add function');

        start();
    });
});

asyncModuleTest("load: when called twice in a row for the same module, both callbacks fire", function (require, exports, module) {
    var numberOfLoadsSoFar = 0;

    module.load("demos/math", function onLoad1() {
        ok(true, "First callback");

        ++numberOfLoadsSoFar;
        if (numberOfLoadsSoFar === 2) {
            start();
        }
    });

    module.load("demos/math", function onLoad2() {
        ok(true, "Second callback");

        ++numberOfLoadsSoFar;
        if (numberOfLoadsSoFar === 2) {
            start();
        }
    });
});

asyncModuleTest("load: when called twice in a row for the same nonextant module, both callbacks fire", function (require, exports, module) {
    var numberOfLoadsSoFar = 0;

    module.load("asdf", function onLoad1() {
        ok(true, "First callback");

        ++numberOfLoadsSoFar;
        if (numberOfLoadsSoFar === 2) {
            start();
        }
    });

    module.load("asdf", function onLoad2() {
        ok(true, "Second callback");

        ++numberOfLoadsSoFar;
        if (numberOfLoadsSoFar === 2) {
            start();
        }
    });
});

asyncModuleTest("load: does not memoize the loaded module", function (require, exports, module) {
    module.load("demos/math", function onModuleLoaded() {
        strictEqual(require.isMemoized("demos/math"), false, "The module was not memoized");
        start();
    });
});

asyncModuleTest("provide: passing an empty dependency array still results in the callback being called", function (require, exports, module) {
    module.provide([], function onModulesProvided() {
        ok(true, "Callback was called");
        start();
    });
});

asyncModuleTest("provide: when passing multiple dependencies, all of them are memoized by the time the callback is called", function (require, exports, module) {
    module.provide(["demos/area", "demos/perimeter"], function onModulesProvided() {
        strictEqual(require.isMemoized("demos/area"), true, "First dependency is memoized");
        strictEqual(require.isMemoized("demos/perimeter"), true, "Second dependency is memoized");
        start();
    });
});

asyncModuleTest("provide: understands relative identifiers", function (require, exports, module) {
    module.provide(["demos/../demos/math"], function onModulesProvided() {
        strictEqual(require.isMemoized("demos/math"), true, "It figured out demos/../demos");
        start();
    });
});

asyncModuleTest("provide: still calls the callback even if one of the modules in the dependencies array doesn't exist", function (require, exports, module) {
    module.provide(["asdf", "demos/math"], function onModulesProvided() {
        ok(true, "Callback still got called");
        strictEqual(require.isMemoized("demos/math"), true, "The extant module is memoized");
        strictEqual(require.isMemoized("asdf"), false, "The nonextant module is not memoized");

        start();
    });
});

asyncModuleTest("provide: two calls in a row for a nonextant module still results in both callbacks being called", function (require, exports, module) {
    var numberOfLoadsSoFar = 0;

    module.provide(["asdf"], function onProvided1() {
        ok(true, "First callback");

        ++numberOfLoadsSoFar;
        if (numberOfLoadsSoFar === 2) {
            start();
        }
    });

    module.provide(["asdf"], function onProvided2() {
        ok(true, "Second callback");

        ++numberOfLoadsSoFar;
        if (numberOfLoadsSoFar === 2) {
            start();
        }
    });
});

asyncModuleTest("provide: providing an extant module then a nonextant module does not mistakenly memoize the nonextant module using leftovers from the extant one", function (require, exports, module) {
    module.provide(["demos/math"], function () {
        ok(true, "Callback for extant module reached");
        module.provide(["asdf"], function () {
            ok(true, "Callback for nonextant module reached");

            strictEqual(require.isMemoized("demos/math"), true, "The extant module is memoized");
            strictEqual(require.isMemoized("asdf"), false, "The nonextant module is not memoized");

            start();
        });
    });
});

// See http://groups.google.com/group/commonjs/browse_thread/thread/50d4565bd07e03cb
asyncModuleTest("provide: does not modify module.dependencies", function (require, exports, module) {
    module.provide(["demos/math"], function onModulesProvided() {
        deepEqual(module.dependencies, [], "The dependencies array is still empty.");

        start();
    });
});

// See http://groups.google.com/group/commonjs/browse_thread/thread/50d4565bd07e03cb
asyncModuleTest("provide: does not make labels available to require", function (require, exports, module) {
    module.provide([{ math: "demos/math" }], function onModulesProvided() {
        raises(function () {
            require("math");
        }, "Trying to require using the label throws an error");

        start();
    });
});

asyncModuleTest("eventually: causes the function to be called within a second", function (require, exports, module) {
    var wasCalled = false;
    var gaveUpAlready = false;
    function callMeEventually() {
        if (!gaveUpAlready) {
            wasCalled = true;

            ok(true, "The function was called, eventually");
            start();
        }
    }

    module.eventually(callMeEventually);

    setTimeout(function () {
        if (!wasCalled) {
            gaveUpAlready = true;

            ok(false, "The function wasn't called within a second... that's enough eventuality for me");
            start();
        }
    }, 1000);
});