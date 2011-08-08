newTestSet("Module provider plug-ins");

asyncTest("Overriden load: is called when calling module.provide, with the correct identifier", function () {
    var identifierLoadWasCalledWith = null;
    var originalModuleLoad = module.constructor.prototype.load;
    module.constructor.prototype.load = function (moduleIdentifier, onModuleLoaded) {
        identifierLoadWasCalledWith = moduleIdentifier;

        originalModuleLoad(moduleIdentifier, onModuleLoaded);
    };

    module.declare([], function () {
        module.provide(["demos/math"], function () {
            strictEqual(identifierLoadWasCalledWith, "demos/math", "The overriden version of module.load was called with the same module identifier as was passed to the un-overriden module.provide.");
            start();
        });
    });
});

test("Overriden load: still has its arguments validated, without the plug-in author having to do so specifically", function () {
    module.constructor.prototype.load = function (moduleIdentifier, onModuleLoaded) {
        onModuleLoaded();
    };

    assertArgumentsValidated(module.load, { moduleIdentifier: String, onModuleLoaded: Function });
});

test("Overriden provide: is called to provide the unmemoized dependencies when declaring the main module", function () {
    var idsOfModulesProvideIsCalledOn = [];
    var dependenciesProvideWasCalledWith = [];
    module.constructor.prototype.provide = function (dependencies, onAllProvided) {
        idsOfModulesProvideIsCalledOn.push(this.id);
        dependenciesProvideWasCalledWith = dependenciesProvideWasCalledWith.concat(dependencies);
        onAllProvided();
    };

    require.memoize("dependency/1", [], function () { });

    module.declare(["dependency/1", "dependency/2"], function () {
        ok(idsOfModulesProvideIsCalledOn.indexOf("") !== -1, "The overriden version of module.provide was called with this.id set correctly");
        ok(dependenciesProvideWasCalledWith.indexOf("dependency/2") !== -1, "The overriden version of module.provide was called for the un-memoized dependency");
    });
});

asyncTest("Overriden provide: is called to provide the un-memoized dependencies of a memoized module", function () {
    var idsOfModulesProvideIsCalledOn = [];
    var dependenciesProvideWasCalledWith = [];

    var originalModuleProvide = module.constructor.prototype.provide;
    module.constructor.prototype.provide = function (dependencies, onAllProvided) {
        idsOfModulesProvideIsCalledOn.push(this.id);
        dependenciesProvideWasCalledWith = dependenciesProvideWasCalledWith.concat(dependencies);

        originalModuleProvide.call(this, dependencies, onAllProvided);
    };

    require.memoize("dependency", [], function () { });
    require.memoize("memoized", ["dependency", "demos/math"], function () { });

    module.declare(["memoized"], function () {
        ok(idsOfModulesProvideIsCalledOn.indexOf("memoized") !== -1, "The overriden version of module.provide was called with this.id set to the same value passed to require.memoize");
        ok(dependenciesProvideWasCalledWith.indexOf("demos/math") !== -1, "The overriden version of module.provide was called for the un-memoized dependency");

        start();
    });
});

test("Overriden provide: still has its arguments validated, without the plug-in author having to do so specifically", function () {
    module.constructor.prototype.provide = function (dependencies, onAllProvided) {
        onAllProvided();
    };

    assertArgumentsValidated(module.provide, { dependencies: Array, onAllProvided: Function });
});

test("Overriden declare: is called when declaring the main module", function () {
    var dependenciesDeclareWasCalledWith = null;
    var factoryFunctionDeclareWasCalledWith = null;
    module.constructor.prototype.declare = function (dependencies, moduleFactory) {
        dependenciesDeclareWasCalledWith = dependencies;
        factoryFunctionDeclareWasCalledWith = moduleFactory;
    };

    var dependencies = ["dependency/1", "dependency/2"];
    var moduleFactory = function () { };
    module.declare(dependencies, moduleFactory);

    deepEqual(dependenciesDeclareWasCalledWith, dependencies, "The correct dependencies array was passed to the overriden module.declare");
    strictEqual(factoryFunctionDeclareWasCalledWith, moduleFactory, "The correct factory function was passed to the overriden module.declare");
});

asyncModuleTest("Overriden declare: is called when using module.load", function (require, exports, module) {
    // We know that demos/math does not return alternate exports and does not pass the optional dependency array,
    // so we implement a stub based on that knowledge instead of a more general one.
    var mathExports = {};
    module.constructor.prototype.declare = function (moduleFactory) {
        moduleFactory(null, mathExports, null);
    };

    module.load("demos/math", function () {
        strictEqual(typeof mathExports.add, "function", "Executing the factory function that was passed to the overriden module.declare returns an object with the expected exports");

        start();
    });
});

test("Overriden declare: still has its arguments validated, without the plug-in author having to do so specifically", function () {
    module.constructor.prototype.declare = function () {};

    // Case 1: Just the factory function
    assertArgumentsValidated(module.declare, { moduleFactory: Function });

    // Case 2: dependencies array plus factory function
    assertArgumentsValidated(module.declare, { dependencies: Array, moduleFactory: Function });
});

test("Overriden eventually: still has its argument validated, without the plug-in author having to do so specifically", function () {
    module.constructor.prototype.eventually = function () { };
    assertArgumentsValidated(module.eventually, { functionToCallEventually: Function });
});