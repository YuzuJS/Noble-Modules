newTestSet("Circular dependencies");

asyncModuleTest("Can provide a module that depends on a module that depends on the original module", function (require, exports, module) {
    module.provide(["demos/circular/circularA"], function onModulesProvided() {
        ok(true, "module.provide callback called");

        var circularA = require("demos/circular/circularA");
        strictEqual(typeof circularA, "object", "circularA module has been exported");
        strictEqual(typeof circularA.getValue, "function", "circularA's getValue function has been exported");
        strictEqual(typeof circularA.getValueFromB, "function", "circularA's getValueFromB function has been exported");
        strictEqual(circularA.getValueFromB(), "b", "circularA's getValueFromB function returns the correct value");

        start();
    });
});

asyncModuleTest("Can provide two mutually-dependent modules in the same module.provide call", function (require, exports, module) {
    module.provide(["demos/circular/circularA", "demos/circular/circularB"], function onModulesProvided() {
        ok(true, "module.provide callback called");

        var circularA = require("demos/circular/circularA");
        strictEqual(typeof circularA, "object", "circularA module has been exported");
        strictEqual(typeof circularA.getValue, "function", "circularA's getValue function has been exported");
        strictEqual(typeof circularA.getValueFromB, "function", "circularA's getValueFromB function has been exported");
        strictEqual(circularA.getValueFromB(), "b", "circularA's getValueFromB function returns the correct value");

        var circularB = require("demos/circular/circularB");
        strictEqual(typeof circularB, "object", "circularB module has been exported");
        strictEqual(typeof circularB.getValue, "function", "circularB's getValue function has been exported");
        strictEqual(typeof circularB.getValueFromA, "function", "circularB's getValueFromA function has been exported");
        strictEqual(circularB.getValueFromA(), "a", "circularB's getValueFromA function returns the correct value");

        start();
    });
});

asyncModuleTest("Can provide the modules in a two-module circle in parallel, via two module.provide calls", function (require, exports, module) {
    var callbacksCalled = 0;
    var desiredCallbacksCalled = 2;
    function onCallback() {
        if (++callbacksCalled === desiredCallbacksCalled) {
            start();
        }
    }

    module.provide(["demos/circular/circularA"], function onAProvided() {
        ok(true, "module.provide callback called for circularA");

        var circularA = require("demos/circular/circularA");
        strictEqual(typeof circularA, "object", "circularA module has been exported");
        strictEqual(typeof circularA.getValue, "function", "circularA's getValue function has been exported");
        strictEqual(typeof circularA.getValueFromB, "function", "circularA's getValueFromB function has been exported");
        strictEqual(circularA.getValueFromB(), "b", "circularA's getValueFromB function returns the correct value");

        onCallback();
    });
    module.provide(["demos/circular/circularB"], function onBProvided() {
        ok(true, "module.provide callback called for circularB");

        var circularB = require("demos/circular/circularB");
        strictEqual(typeof circularB, "object", "circularB module has been exported");
        strictEqual(typeof circularB.getValue, "function", "circularB's getValue function has been exported");
        strictEqual(typeof circularB.getValueFromA, "function", "circularB's getValueFromA function has been exported");
        strictEqual(circularB.getValueFromA(), "a", "circularB's getValueFromA function returns the correct value");

        onCallback();
    });
});

asyncModuleTest("Can provide a module that depends on a module that depends on the original module, while also depending on a nonextant module", function (require, exports, module) {
    module.provide(["demos/circular/circularAndNonextantA"], function onModulesProvided() {
        ok(true, "module.provide callback called");

        require("demos/circular/circularAndNonextantA");
        ok(true, "module was initialized");

        start();
    });
});

asyncModuleTest("Can provide a module in a three-module dependency circle", function (require, exports, module) {
    module.provide(["demos/circular/circular1"], function onModulesProvided() {
        ok(true, "module.provide callback called");

        var circular1 = require("demos/circular/circular1");
        strictEqual(typeof circular1, "object", "circular1 module has been exported");
        strictEqual(typeof circular1.getValue, "function", "circular1's getValue function has been exported");
        strictEqual(typeof circular1.getValueFrom2, "function", "circular1's getValueFrom2 function has been exported");
        strictEqual(circular1.getValueFrom2(), "2", "circular1's getValueFrom2 function returns the correct value");

        start();
    });
});

asyncModuleTest("Can provide all three modules in a three-module dependency circle in the same module.provide call", function (require, exports, module) {
    module.provide(["demos/circular/circular1", "demos/circular/circular3", "demos/circular/circular2"], function onModulesProvided() {
        ok(true, "module.provide callback called");

        require("demos/circular/circular1");
        ok(true, "circular1 module initialized");

        require("demos/circular/circular2");
        ok(true, "circular2 module initialized");

        require("demos/circular/circular3");
        ok(true, "circular3 module initialized");

        start();
    });
});


asyncModuleTest("Can provide the modules in a three-module dependency circle in parallel, via three module.provide calls", function (require, exports, module) {
    var callbacksCalled = 0;
    var desiredCallbacksCalled = 3;
    function onCallback() {
        if (++callbacksCalled === desiredCallbacksCalled) {
            start();
        }
    }

    module.provide(["demos/circular/circular1"], function on1Provided() {
        ok(true, "module.provide callback called for circular1");

        require("demos/circular/circular1");
        ok(true, "circular1 module initialized");

        onCallback();
    });

    module.provide(["demos/circular/circular2"], function on1Provided() {
        ok(true, "module.provide callback called for circular2");

        require("demos/circular/circular2");
        ok(true, "circular2 module initialized");

        onCallback();
    });

    module.provide(["demos/circular/circular3"], function on1Provided() {
        ok(true, "module.provide callback called for circular3");

        require("demos/circular/circular3");
        ok(true, "circular3 module initialized");

        onCallback();
    });
});
