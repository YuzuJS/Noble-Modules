QUnit.module("Debug module"); // Don't use newTestSet because the lifecycle there uses the debug module, which is the system under test here.

test("Debug module is provided to global require", function () {
    var debugModule = require("nobleModules");

    strictEqual(!!debugModule, true, "exports are truthy");
    strictEqual(typeof debugModule, "object", "exports are an object");
});

test("Setting a nonstandard main module directory is reflected in require.uri (but not require.id)", function () {
    var debugModule = require("nobleModules");

    debugModule.reset({ mainModuleDirectory: "somewhere/else" });

    strictEqual(require.uri("a/module"), "somewhere/else/a/module.js", "The URI returned from require.uri included the specified main module directory");
    strictEqual(require.id("a/module"), "a/module", "The ID returned from require.id did not change on account of the main module directory");
});



asyncTest("By default, scripts are cached", function () {
    var debugModule = require("nobleModules");

    debugModule.reset();
    
    module.declare(["demos/math"], function (require, exports, module) {
        var debugScriptEl = document.head.querySelector("script[src^='demos/math.js?']");
        var directlyIncludedScriptEl = document.head.querySelector("script[src='demos/math.js']");
        
        notStrictEqual(directlyIncludedScriptEl, null, "In non-debug mode, the <script /> element was included directly");
        strictEqual(debugScriptEl, null, "In non-debug mode, the <script /> element was not included with a query string");

        start();
    });
});

asyncTest("If requested, caching is prevented", function () {
    var debugModule = require("nobleModules");

    debugModule.reset();
    debugModule.setDebugOptions({ disableCaching: true });

    module.declare(["demos/math"], function (require, exports, module) {
        var debugScriptEl = document.head.querySelector("script[src^='demos/math.js?']");
        var directlyIncludedScriptEl = document.head.querySelector("script[src='demos/math.js']");

        strictEqual(directlyIncludedScriptEl, null, "In debug mode, the <script /> element was not included directly");
        notStrictEqual(debugScriptEl, null, "In debug mode, the <script /> element was included with a query string");

        start();
    });
});

asyncTest("If requested, calling require for an ID not specified in the dependency array gives a warning in the console", function () {
    if (!window.console) {
        ok(true, "No console object; bypassing this test.");
        setTimeout(start, 0);
        return;
    }

    var debugModule = require("nobleModules");

    debugModule.reset();
    debugModule.setDebugOptions({ warnAboutUndeclaredDependencies: true });

    var recordedWarning = null;
    window.console.warn = function (warning) {
        recordedWarning = warning;
    };

    // Memoize the math module to simulate e.g. another module specifying it as a dependency and thus it being provided already.
    require.memoize("demos/math", [], function () { });

    // Our main module is badly-behaved, because it uses dependencies it doesn't declare.
    // But the require call will not fail, since the module is already provided (as per above); it got lucky.
    // Debug mode should warn about this bad behavior.
    module.declare([], function (require, exports, module) {
        require("demos/math");

        strictEqual(recordedWarning, 'The module with ID "demos/math" was not specified in the dependency array for the "" module.');

        start();
    });
});