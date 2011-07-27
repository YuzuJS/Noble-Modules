newTestSet("require namespace");

moduleTest("id: validates its argument", function (require, exports, module) {
    assertArgumentsValidated(require.id, { moduleIdentifier: String });
});

moduleTest("id: when given an absolute ID, returns it directly", function (require, exports, module) {
    strictEqual(require.id("demos/restaurants"), "demos/restaurants", "It returned what it was given for the case with no ..s or .s");
});

moduleTest("id: canonicalizes relative identifiers", function (require, exports, module) {
    strictEqual(require.id("./demos/restaurants"), "demos/restaurants", "It figured out ./ relative to the main module");
    strictEqual(require.id("demos/../demos/restaurants"), "demos/restaurants", "It figured out demos/../demos");
    strictEqual(require.id("demos/../demos/circular/../theForce"), "demos/theForce", "It figured out an identifier with two ../s");
});

moduleTest("uri: validates its argument", function (require, exports, module) {
    assertArgumentsValidated(require.uri, { moduleIdentifier: String });
});

moduleTest("uri: turns an absolute ID into the corresponding URI", function (require, exports, module) {
    strictEqual(require.uri("demos/restaurants"), "demos/restaurants.js", "It only appended '.js' for the case with no ..s or .s");
});

moduleTest("uri: turns relative identifiers into absolute URIs", function (require, exports, module) {
    strictEqual(require.uri("./demos/restaurants"), "demos/restaurants.js", "It figured out ./ relative to the main module");
    strictEqual(require.uri("demos/../demos/restaurants"), "demos/restaurants.js", "It figured out demos/../demos");
    strictEqual(require.uri("demos/../demos/circular/../theForce"), "demos/theForce.js", "It figured out an identifier with two ../s");
});

moduleTest("memoize: validates its arguments", function (require, exports, module) {
    assertArgumentsValidated(require.memoize, { id: String, dependencies: Array, moduleFactory: Function });
});

moduleTest("memoize: throws an error when trying to memoize a module that is already memoized", function (require, exports, module) {
    require.memoize("someId", [], function moduleFactory() { });

    raises(function () {
        require.memoize("someId", [], function anotherModuleFactory() { });
    }, Error, "Threw an error when trying to memoize twice.");
});

test("memoize: makes the memoized module available to require", function () {
    require.memoize("extraModuleEnvironment/memoized", [], function (require, exports, module) { exports.hi = "hello" });

    var memoized = require("extraModuleEnvironment/memoized");
    deepEqual(memoized, { hi: "hello" }, "The memoized module was provided to require");
});

moduleTest("memoize: can be used to memoize dependencies of memoized modules", function (require, exports, module) {
    require.memoize("memoizing/dependent", ["memoizing/dependency"], function (require, exports, module) {
        var dependency = require("memoizing/dependency");

        exports.greeting = dependency.hi;
    });
    require.memoize("memoizing/dependency", [], function (require, exports, module) { exports.hi = "hello"; });

    var dependent = require("memoizing/dependent");
    deepEqual(dependent, { greeting: "hello" }, "The dependent module was memoized");
});

moduleTest("isMemoized: validates its argument", function (require, exports, module) {
    assertArgumentsValidated(require.isMemoized, { id: String });
});

moduleTest("require: validates its argument", function (require, exports, module) {
    assertArgumentsValidated(require, { moduleIdentifier: String });
});

moduleTest("require: throws an error for nonextant module", function (require, exports, module) {
    raises(function () {
        require("asdf");
    }, Error, "Calling require threw an error when requesting a module that does not exist");
});

moduleTest("require: throws an error for extant, but not provided, module", function (require, exports, module) {
    raises(function () {
        require("demos/math");
    }, Error, "Calling require threw an error when requesting the demos/math module");
});

moduleTest("Unsupported and deprecated parts of the spec are not defined", function (require, exports, module) {
    strictEqual(require.paths, undefined, "require.paths is not defined");
    strictEqual(require.main, undefined, "require.main is not defined");
});