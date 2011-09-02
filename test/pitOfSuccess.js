newTestSet("Pit of success");

moduleTest("Unsupported and deprecated parts of the spec are not defined", function (require, exports, module) {
    strictEqual(module.uri, undefined, "module.uri is not defined");
    strictEqual(require.paths, undefined, "require.paths is not defined");
    strictEqual(require.main, undefined, "require.main is not defined");
});

 test("Extra-module environment require: cannot mess with", function () {
    assertNotWritable(function () { return require; }, function () { require = "blah"; }, "Global require");
    assertNotConfigurable(function () { return require; }, function () { delete require; }, "Global require");
    assertNotExtensible(require, "Global require");
});

test("Extra-module environment module: cannot mess with", function () {
    assertNotWritable(function () { return module; }, function () { module = "blah"; }, "Global module");
    assertNotConfigurable(function () { return module; }, function () { delete module; }, "Global module");
});

moduleTest("module.id: cannot mess with", function (require, exports, module) {
    assertNotWritable(function () { return module.id }, function () { module.id = "blaaah"; }, "module.id");
    assertNotConfigurable(function () { return module.id }, function () { delete module.id; }, "module.id");
});

moduleTest("module.dependencies: cannot mess with", function (require, exports, module) {
    assertNotWritable(function () { return module.dependencies }, function () { module.dependencies = ["a", "b"]; }, "module.dependencies");
    assertNotConfigurable(function () { return module.dependencies }, function () { delete module.dependencies; }, "module.dependencies");

    var dependenciesBeforePush = module.dependencies.slice();
    module.dependencies.push("c");
    deepEqual(dependenciesBeforePush, module.dependencies, "After attempting to push a new element onto module.dependencies, its items did not change");
});

moduleTest("module.declare: validates its arguments", function (require, exports, module) {
    // Case 1: Just the factory function
    assertArgumentsValidated(module.declare, { moduleFactory: Function });

    // Case 2: dependencies array plus factory function
    assertArgumentsValidated(module.declare, { dependencies: Array, moduleFactory: Function });

    // TODO: test for validation that parameters are always either strings or objects that contain only string properties?
});

moduleTest("module.eventually: validates its argument", function (require, exports, module) {
    assertArgumentsValidated(module.eventually, { functionToCallEventually: Function });
});

moduleTest("module.load: validates its arguments", function (require, exports, module) {
    assertArgumentsValidated(module.load, { moduleIdentifier: String, onModuleLoaded: Function });
});

moduleTest("module.provide: validates its arguments", function (require, exports, module) {
    assertArgumentsValidated(module.provide, { dependencies: Array, onAllProvided: Function });
});

moduleTest("require: validates its argument", function (require, exports, module) {
    assertArgumentsValidated(require, { moduleIdentifier: String });
});

moduleTest("require.id: validates its argument", function (require, exports, module) {
    assertArgumentsValidated(require.id, { moduleIdentifier: String });
});

moduleTest("require.isMemoized: validates its argument", function (require, exports, module) {
    assertArgumentsValidated(require.isMemoized, { id: String });
});

moduleTest("require.memoize: validates its arguments", function (require, exports, module) {
    assertArgumentsValidated(require.memoize, { id: String, dependencies: Array, moduleFactory: Function });
});

moduleTest("require.uri: validates its argument", function (require, exports, module) {
    assertArgumentsValidated(require.uri, { moduleIdentifier: String });
});

test("Overriden load: still has its arguments validated, without the plug-in author having to do so specifically", function () {
    var originalModuleLoad = module.constructor.prototype.load;
    module.constructor.prototype.load = function (moduleIdentifier, onModuleLoaded) {
        onModuleLoaded();
    };

    assertArgumentsValidated(module.load, { moduleIdentifier: String, onModuleLoaded: Function });

    module.constructor.prototype.load = originalModuleLoad;
});

test("Overriden provide: still has its arguments validated, without the plug-in author having to do so specifically", function () {
    var originalModuleProvide = module.constructor.prototype.provide;
    module.constructor.prototype.provide = function (dependencies, onAllProvided) {
        onAllProvided();
    };

    assertArgumentsValidated(module.provide, { dependencies: Array, onAllProvided: Function });

    module.constructor.prototype.provide = originalModuleProvide;
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
