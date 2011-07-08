newTestSet("Circular dependencies");

asyncModuleTest("Can provide a module that depends on a module that depends on it", function (require, exports, module) {
    module.provide(["demos/circular/circularA"], function onModulesProvided() {
        ok(true, "module.provide callback called");

        var circularA = require("demos/circular/circularA");
        strictEqual(typeof circularA, "object", "circularA module has been exported");
        strictEqual(typeof circularA.getValue, "function", "circularA's getValue function has been exported");
        strictEqual(typeof circularA.getValueFromB, "function", "circularA's getValueFromB function has been exported");

        start();
    });
});

asyncModuleTest("Can provide two mutually-dependent modules", function (require, exports, module) {
    module.provide(["demos/circular/circularA", "demos/circular/circularB"], function onModulesProvided() {
        ok(true, "module.provide callback called");

        var circularA = require("demos/circular/circularA");
        strictEqual(typeof circularA, "object", "circularA module has been exported");
        strictEqual(typeof circularA.getValue, "function", "circularA's getValue function has been exported");
        strictEqual(typeof circularA.getValueFromB, "function", "circularA's getValueFromB function has been exported");

        var circularB = require("demos/circular/circularB");
        strictEqual(typeof circularB, "object", "circularB module has been exported");
        strictEqual(typeof circularB.getValue, "function", "circularB's getValue function has been exported");
        strictEqual(typeof circularB.getValueFromA, "function", "circularB's getValueFromA function has been exported");

        start();
    });
});