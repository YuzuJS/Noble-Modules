newTestSet("Module provider plug-ins");

asyncTest("An overriden module.constructor.prototype.load is called by module.provide with the correct identifier", function () {
    var identifierLoadWasCalledWith = null;
    console.dir(module.constructor);
    module.constructor.prototype.load = function (moduleIdentifier, onModuleLoaded) {
        identifierLoadWasCalledWith = moduleIdentifier;

        onModuleLoaded();
    };

    module.provide(["not/really/a/module"], function () {
        strictEqual(identifierLoadWasCalledWith, "not/really/a/module", "The overriden version of module.load was called with the same module identifier as passed to the un-overriden module.provide.");
        start();
    });
});