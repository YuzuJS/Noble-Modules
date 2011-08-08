newTestSet("Recursive provision");

asyncModuleTest("Can provide a module that specifies its dependency via a relative path", function (require, exports, module) {
    module.provide(["demos/area"], function onModulesProvided() {
        ok(true, "Callback called");

        var area = require("demos/area");
        strictEqual(area.rectangle(2, 3), 6, "Area of a rectangle successfully computed using two modules in collaboration (require, then use later)");
        strictEqual(area.square(3), 9, "Area of a square successfully computed using two modules in collaboration (require and pick a property immediately)");

        start();
    });
});

asyncModuleTest("Can provide two modules (at the same time) that both require the same module", function (require, exports, module) {
    module.provide(["demos/area", "demos/perimeter"], function onModulesProvided() {
        ok(true, "Callback called");

        var area = require("demos/area");
        var perimeter = require("demos/perimeter");

        strictEqual(area.rectangle(2, 3), 6, "Area of a rectangle successfully computed using two modules in collaboration (require, then use later)");
        strictEqual(area.square(3), 9, "Area of a square successfully computed using two modules in collaboration (require and pick a property immediately)");

        strictEqual(perimeter.rectangle(2, 3), 10, "Perimeter of a rectangle successfully computed using two modules in collaboration (require, then use later)");
        strictEqual(perimeter.square(3), 12, "Perimeter of a square successfully computed using two modules in collaboration (require and pick a property immediately)");

        start();
    });
});

asyncModuleTest("Can provide two modules (one after the other) that both require the same module", function (require, exports, module) {
    var numberOfProvidesSoFar = 0;

    module.provide(["demos/area"], function () {
        ok(true, "area provide callback called");

        var area = require("demos/area");

        strictEqual(area.rectangle(2, 3), 6, "Area of a rectangle successfully computed using two modules in collaboration (require, then use later)");
        strictEqual(area.square(3), 9, "Area of a square successfully computed using two modules in collaboration (require and pick a property immediately)");

        if (++numberOfProvidesSoFar === 2) {
            start();
        }
    });

    module.provide(["demos/perimeter"], function () {
        ok(true, "perimeter provide callback called");

        var perimeter = require("demos/perimeter");

        strictEqual(perimeter.rectangle(2, 3), 10, "Perimeter of a rectangle successfully computed using two modules in collaboration (require, then use later)");
        strictEqual(perimeter.square(3), 12, "Perimeter of a square successfully computed using two modules in collaboration (require and pick a property immediately)");

        if (++numberOfProvidesSoFar === 2) {
            start();
        }
    });
});

asyncModuleTest("Can provide the same module twice in a row, for the simple case of a module with no dependencies", function (require, exports, module) {
    var numberOfProvidesSoFar = 0;

    function assertMathExports(math) {
        strictEqual(typeof math, "object", "math module has been exported.");
        strictEqual(typeof math.add, "function", "math's add function has been exported");
        strictEqual(typeof math.multiply, "function", "math's multiply function has been exported");
    }

    module.provide(["demos/math"], function () {
        ++numberOfProvidesSoFar;
        ok(true, "first math provide callback called");

        assertMathExports(require("demos/math"));
        if (numberOfProvidesSoFar === 2) {
            start();
        }
    });

    module.provide(["demos/math"], function () {
        ++numberOfProvidesSoFar;
        ok(true, "second math provide callback called");

        assertMathExports(require("demos/math"));
        if (numberOfProvidesSoFar === 2) {
            start();
        }
    });
});

asyncModuleTest("Can provide the same module twice in a row, for the case of a module with dependencies", function (require, exports, module) {
    var numberOfProvidesSoFar = 0;

    function assertAreaExports(area) {
        strictEqual(typeof area, "object", "Area modules has been exported");
        strictEqual(typeof area.rectangle, "function", "Area's add function has been exported");
        strictEqual(typeof area.square, "function", "Area's square function has been exported");
    }

    module.provide(["demos/area"], function () {
        ++numberOfProvidesSoFar;
        ok(true, "first area provide callback called");

        assertAreaExports(require("demos/area"));
        if (numberOfProvidesSoFar === 2) {
            start();
        }
    });

    module.provide(["demos/area"], function () {
        ++numberOfProvidesSoFar;
        ok(true, "second area provide callback called");

        assertAreaExports(require("demos/area"));
        if (numberOfProvidesSoFar === 2) {
            start();
        }
    });
});

asyncTest("If the main module depends on a memoized module that depends on un-memoized modules, the un-memoized modules are provided", function () {
    require.memoize("memoized", ["demos/math"], function (require, exports, module) {
        var math = require("demos/math");

        exports.increment = function (x) {
            return math.add(x, 1);
        };
    });

    module.declare(["memoized"], function (require, exports, module) {
        ok(true, "Main module factory function was called");
        strictEqual(require.isMemoized("demos/math"), true, "The math module is now memoized, even though we didn't do so explicitly");

        var memoized = require("memoized");
        var five = memoized.increment(4);
        strictEqual(five, 5, "The explicitly-memoized module correctly used the unmemoized module to increment 4 and return 5");

        start();
    });
});

asyncModuleTest("Providing a memoized module that depends on un-memoized modules results in the un-memoized modules being provided", function (require, exports, module) {
    require.memoize("memoized", ["demos/math"], function (require, exports, module) {
        var math = require("demos/math");

        exports.increment = function (x) {
            return math.add(x, 1);
        };
    });

    module.provide(["memoized"], function () {
        ok(true, "Provide callback was called");
        strictEqual(require.isMemoized("demos/math"), true, "The math module is now memoized, even though we didn't do so explicitly");

        var memoized = require("memoized");
        var five = memoized.increment(4);
        strictEqual(five, 5, "The explicitly-memoized module correctly used the unmemoized module to increment 4 and return 5");

        start();
    });
});
