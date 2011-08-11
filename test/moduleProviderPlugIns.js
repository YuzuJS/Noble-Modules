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

            module.constructor.prototype.load = originalModuleLoad;
            start();
        });
    });
});

test("Overriden load: still has its arguments validated, without the plug-in author having to do so specifically", function () {
    var originalModuleLoad = module.constructor.prototype.load;
    module.constructor.prototype.load = function (moduleIdentifier, onModuleLoaded) {
        onModuleLoaded();
    };

    assertArgumentsValidated(module.load, { moduleIdentifier: String, onModuleLoaded: Function });

    module.constructor.prototype.load = originalModuleLoad;
});

test("Overriden provide: is called to provide the unmemoized dependencies when declaring the main module", function () {
    var idsOfModulesProvideIsCalledOn = [];
    var dependenciesProvideWasCalledWith = [];

    var originalModuleProvide = module.constructor.prototype.provide;
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

    module.constructor.prototype.provide = originalModuleProvide;
});

asyncTest("Overriden provide: is called to provide the un-memoized dependencies of a memoized dependency of a memoized dependency of the main module", function () {
    var idsOfModulesProvideIsCalledOn = [];
    var dependenciesProvideWasCalledWith = [];

    var originalModuleProvide = module.constructor.prototype.provide;
    module.constructor.prototype.provide = function (dependencies, onAllProvided) {
        idsOfModulesProvideIsCalledOn.push(this.id);
        dependenciesProvideWasCalledWith = dependenciesProvideWasCalledWith.concat(dependencies);

        originalModuleProvide.call(this, dependencies, onAllProvided);
    };

    require.memoize("deeperDependency", ["demos/math"], function () { });
    require.memoize("dependency", ["deeperDependency"], function () { });
    require.memoize("memoized", ["dependency"], function () { });

    module.declare(["memoized"], function () {
        ok(idsOfModulesProvideIsCalledOn.indexOf("deeperDependency") !== -1, "The overriden version of module.provide was called with this.id set to that of the two-levels-deep dependency");
        ok(dependenciesProvideWasCalledWith.indexOf("demos/math") !== -1, "The overriden version of module.provide was called for the un-memoized dependency");

        module.constructor.prototype.provide = originalModuleProvide;
        start();
    });
});

asyncTest("Overriden provide: works even with circular dependencies", function () {
    var idsOfModulesProvideIsCalledOn = [];
    var dependenciesProvideWasCalledWith = [];

    var originalModuleProvide = module.constructor.prototype.provide;
    module.constructor.prototype.provide = function (dependencies, onAllProvided) {
        idsOfModulesProvideIsCalledOn.push(this.id);
        dependenciesProvideWasCalledWith = dependenciesProvideWasCalledWith.concat(dependencies);

        originalModuleProvide.call(this, dependencies, onAllProvided);
    };

    module.declare(["demos/circular/circularA"], function () {
        ok(idsOfModulesProvideIsCalledOn.indexOf("demos/circular/circularA") !== -1, "The overriden version of module.provide was called with this.id set to that of the module the main module depends on");
        ok(dependenciesProvideWasCalledWith.indexOf("demos/circular/circularB") !== -1, "The overriden version of module.provide was called to provide the other module in the circular dependency chain");

        module.constructor.prototype.provide = originalModuleProvide;
        start();
    });
});

asyncTest("Overriden provide: works even with circular dependencies where the plug-in provides a normally nonextant module", function () {
    var idsOfModulesProvideIsCalledOn = [];
    var dependenciesProvideWasCalledWith = [];

    var originalModuleProvide = module.constructor.prototype.provide;
    module.constructor.prototype.provide = function (dependencies, onAllProvided) {
        idsOfModulesProvideIsCalledOn.push(this.id);
        dependenciesProvideWasCalledWith = dependenciesProvideWasCalledWith.concat(dependencies);

        if (dependencies.indexOf("asdf") !== -1) {
            if (!require.isMemoized("asdf")) {
                require.memoize("asdf", [], function () { });
            }

            dependencies = dependencies.splice(dependencies.indexOf("asdf"), 1);
        }

        originalModuleProvide.call(this, dependencies, onAllProvided);
    };

    module.declare(["demos/circular/circularAndNonextantA"], function () {
        ok(idsOfModulesProvideIsCalledOn.indexOf("demos/circular/circularAndNonextantA") !== -1, "The overriden version of module.provide was called with this.id set to that of the module the main module depends on");
        ok(dependenciesProvideWasCalledWith.indexOf("demos/circular/circularAndNonextantB") !== -1, "The overriden version of module.provide was called to provide the other module in the circular dependency chain");
        ok(dependenciesProvideWasCalledWith.indexOf("asdf") !== -1, "The overriden version of module.provide was called to provide the module the un-memoized module outside the circular dependency chain");

        module.constructor.prototype.provide = originalModuleProvide;
        start();
    });
});

asyncTest("Overriden provide: can provide a dependency to a dependency of a memoized module", function () {
    var idsOfModulesProvideIsCalledOn = [];
    var dependenciesProvideWasCalledWith = [];

    var originalModuleProvide = module.constructor.prototype.provide;
    module.constructor.prototype.provide = function (dependencies, onAllProvided) {
        idsOfModulesProvideIsCalledOn.push(this.id);
        dependenciesProvideWasCalledWith = dependenciesProvideWasCalledWith.concat(dependencies);

        var desiredOperationsCompleted = 1;
        var operationsCompleted = 0;
        function completeOperation() {
            if (++operationsCompleted === desiredOperationsCompleted) {
                onAllProvided();
            }
        }

        if (dependencies.indexOf("providedByPlugin") !== -1) {
            if (!require.isMemoized("providedByPlugin")) {
                ++desiredOperationsCompleted;
                setTimeout(function () {
                    require.memoize("providedByPlugin", [], function () { });
                    completeOperation();
                }, 0);
            }

            dependencies = dependencies.splice(dependencies.indexOf("asdf"), 1);
        }

        originalModuleProvide.call(this, dependencies, completeOperation);
    };

    require.memoize("memoized", ["providedByPlugin", "demos/math"], function () { });

    module.declare(["memoized"], function () {
        ok(idsOfModulesProvideIsCalledOn.indexOf("memoized") !== -1, "The overriden version of module.provide was called with this.id set to that of the memoized dependency");
        ok(dependenciesProvideWasCalledWith.indexOf("providedByPlugin") !== -1, "The overriden version of module.provide was called to provide the module that was only available via plug-in provision");

        module.constructor.prototype.provide = originalModuleProvide;
        start();
    });
});

test("Overriden provide: still has its arguments validated, without the plug-in author having to do so specifically", function () {
    var originalModuleProvide = module.constructor.prototype.provide;
    module.constructor.prototype.provide = function (dependencies, onAllProvided) {
        onAllProvided();
    };

    assertArgumentsValidated(module.provide, { dependencies: Array, onAllProvided: Function });

    module.constructor.prototype.provide = originalModuleProvide;
});

test("Overriden declare: is called when declaring the main module", function () {
    var dependenciesDeclareWasCalledWith = null;
    var factoryFunctionDeclareWasCalledWith = null;

    var originalModuleDeclare = module.constructor.prototype.declare;
    module.constructor.prototype.declare = function (dependencies, moduleFactory) {
        dependenciesDeclareWasCalledWith = dependencies;
        factoryFunctionDeclareWasCalledWith = moduleFactory;
    };

    var dependencies = ["dependency/1", "dependency/2"];
    var moduleFactory = function () { };
    module.declare(dependencies, moduleFactory);

    deepEqual(dependenciesDeclareWasCalledWith, dependencies, "The correct dependencies array was passed to the overriden module.declare");
    strictEqual(factoryFunctionDeclareWasCalledWith, moduleFactory, "The correct factory function was passed to the overriden module.declare");

    module.constructor.prototype.declare = originalModuleDeclare;
});

asyncModuleTest("Overriden declare: is called when using module.load", function (require, exports, module) {
    var mathExports = {};

    var originalModuleDeclare = module.constructor.prototype.declare;
    module.constructor.prototype.declare = function (moduleFactory) {
        // We know that demos/math does not return alternate exports and does not pass the optional dependency array,
        // so we implement a stub based on that knowledge instead of a more general one.
        moduleFactory(null, mathExports, null);
    };

    module.load("demos/math", function () {
        strictEqual(typeof mathExports.add, "function", "Executing the factory function that was passed to the overriden module.declare returns an object with the expected exports");

        module.constructor.prototype.declare = originalModuleDeclare;
        start();
    });
});

test("Overriden declare: still has its arguments validated, without the plug-in author having to do so specifically", function () {
    var originalModuleDeclare = module.constructor.prototype.declare;
    module.constructor.prototype.declare = function () { };

    // Case 1: Just the factory function
    assertArgumentsValidated(module.declare, { moduleFactory: Function });

    // Case 2: dependencies array plus factory function
    assertArgumentsValidated(module.declare, { dependencies: Array, moduleFactory: Function });

    module.constructor.prototype.declare = originalModuleDeclare;
});

test("Overriden eventually: still has its argument validated, without the plug-in author having to do so specifically", function () {
    var originalModuleEventually = module.constructor.prototype.eventually;
    module.constructor.prototype.eventually = function () { };

    assertArgumentsValidated(module.eventually, { functionToCallEventually: Function });

    module.constructor.prototype.eventually = originalModuleEventually;
});