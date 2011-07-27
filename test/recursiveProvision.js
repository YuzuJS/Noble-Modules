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
        ++numberOfProvidesSoFar;
        ok(true, "area provide callback called");

        var area = require("demos/area");

        strictEqual(area.rectangle(2, 3), 6, "Area of a rectangle successfully computed using two modules in collaboration (require, then use later)");
        strictEqual(area.square(3), 9, "Area of a square successfully computed using two modules in collaboration (require and pick a property immediately)");

        if (numberOfProvidesSoFar === 2) {
            start();
        }
    });

    module.provide(["demos/perimeter"], function () {
        ++numberOfProvidesSoFar;
        ok(true, "perimeter provide callback called");

        var perimeter = require("demos/perimeter");

        strictEqual(perimeter.rectangle(2, 3), 10, "Perimeter of a rectangle successfully computed using two modules in collaboration (require, then use later)");
        strictEqual(perimeter.square(3), 12, "Perimeter of a square successfully computed using two modules in collaboration (require and pick a property immediately)");

        if (numberOfProvidesSoFar === 2) {
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