newTestSet("module namespace");

moduleTest("id: cannot mess with", function (require, exports, module) {
    assertNotWritable(function () { return module.id }, function () { module.id = "blaaah"; }, "module.id");
    assertNotConfigurable(function () { return module.id }, function () { delete module.id; }, "module.id");
});

moduleTest("dependencies: cannot mess with", function (require, exports, module) {
    assertNotWritable(function () { return module.dependencies }, function () { module.dependencies = ["a", "b"]; }, "module.dependencies");
    assertNotConfigurable(function () { return module.dependencies }, function () { delete module.dependencies; }, "module.dependencies");

    var dependenciesBeforePush = module.dependencies.slice();
    module.dependencies.push("c");
    deepEqual(dependenciesBeforePush, module.dependencies, "After attempting to push a new element onto module.dependencies, its items did not change");
});

moduleTest("declare: validates its arguments", function (require, exports, module) {
    // Case 1: Just the factory function
    assertArgumentsValidated(module.declare, { moduleFactory: Function });

    // Case 2: dependencies array plus factory function
    assertArgumentsValidated(module.declare, { dependencies: Array, moduleFactory: Function });

    // TODO: test for validation that parameters are always either strings or objects that contain only string properties?
});

asyncTest("declare: accepts labeled dependency objects and correctly provides them to factory function's require", function () {
    module.declare([{ mathLabel: "demos/math"}], function (require, exports, module) {
        strictEqual(require.id("mathLabel"), "demos/math", "The label was translated into the correct ID when using require.id");
        strictEqual(require.uri("mathLabel"), "demos/math.js", "The label was translated into the correct URI when using require.uri");

        var math = require("mathLabel");
        strictEqual(typeof math, "object", 'demos/math module, labeled as "mathLabel," has been provided');
        strictEqual(typeof math.add, "function", 'demos/math module, labeled as "mathLabel," has exported its add function');

        start();
    });
});

moduleTest("load: validates its arguments", function (require, exports, module) {
    assertArgumentsValidated(module.load, { moduleIdentifier: String, onModuleLoaded: Function });
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
    module.load("demos/vader", function onModuleLoaded() {
        strictEqual(require.isMemoized("demos/vader"), false, "demos/vader was not memoized");
        start();
    });
});

moduleTest("provide: validates its arguments", function (require, exports, module) {
    assertArgumentsValidated(module.provide, { dependencies: Array, onAllProvided: Function });
});

asyncModuleTest("provide: passing an empty dependency array still results in the callback being called", function (require, exports, module) {
    module.provide([], function onModulesProvided() {
        ok(true, "Callback was called");
        start();
    });
});

asyncModuleTest("provide: when passing multiple dependencies, all of them are memoized by the time the callback is called", function (require, exports, module) {
    module.provide(["demos/restaurants", "demos/hotsauce"], function onModulesProvided() {
        strictEqual(require.isMemoized("demos/restaurants"), true, "First dependency has been memoized/provided");
        strictEqual(require.isMemoized("demos/hotsauce"), true, "Second dependency has been memoized/provided");
        start();
    });
});

asyncModuleTest("provide: understands relative identifiers", function (require, exports, module) {
    module.provide(["demos/../demos/restaurants"], function onModulesProvided() {
        strictEqual(require.isMemoized("demos/restaurants"), true, "It figured out demos/../demos");
        start();
    });
});

asyncModuleTest("provide: still calls the callback even if one of the modules in the dependencies array doesn't exist", function (require, exports, module) {
    module.provide(["asdf", "demos/restaurants"], function onModulesProvided() {
        ok(true, "Callback still got called");
        strictEqual(require.isMemoized("demos/restaurants"), true, "The extant module got memoized");
        strictEqual(require.isMemoized("asdf"), false, "The nonextant module did not get memoized");

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
    module.provide(["demos/restaurants"], function onModulesProvided() {
        deepEqual(module.dependencies, [], "The dependencies array is still empty.");

        start();
    });
});

// See http://groups.google.com/group/commonjs/browse_thread/thread/50d4565bd07e03cb
asyncModuleTest("provide: does not make labels available to require", function (require, exports, module) {
    module.provide([{ restaurants: "demos/restaurants" }], function onModulesProvided() {
        raises(function () {
            require("restaurants");
        }, "Trying to require using the label throws an error");

        start();
    });
});

moduleTest("eventually: validates its argument", function (require, exports, module) {
    assertArgumentsValidated(module.eventually, { functionToCallEventually: Function });
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

moduleTest("Unsupported and deprecated parts of the spec are not defined", function (require, exports, module) {
    strictEqual(module.uri, undefined, "module.uri is not defined");
});