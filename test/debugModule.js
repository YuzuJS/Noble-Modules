QUnit.module("Debug module"); // Don't use newTestSet because the lifecycle there uses the debug module, which is the system under test here.

test("Debug module is provided to global require", function () {
	var debugModule = window.require("nobleModules/debug");

	strictEqual(!!debugModule, true, "exports are truthy");
	strictEqual(typeof debugModule, "object", "exports are an object");
});

asyncTest("Outside of debug mode, scripts are cached", function () {
	var debugModule = window.require("nobleModules/debug");

	debugModule.reset();
	
	window.module.declare(["demos/math"], function (require, exports, module) {
		var mathScriptEl = document.head.querySelector("script[src='demos/math.js']");

		notStrictEqual(mathScriptEl, null, "In non-debug mode, the <script /> element was included directly");

		start();
	});
});

asyncTest("In debug mode, caching is prevented", function () {
	var debugModule = window.require("nobleModules/debug");

	debugModule.reset();
	debugModule.enableDebug();

	window.module.declare(["demos/math"], function (require, exports, module) {
		var mathScriptEl = document.head.querySelector("script[src^='demos/math.js']");
		var directlyIncludedScriptEl = document.head.querySelector("script[src$='demos/math.js?']");

		strictEqual(directlyIncludedScriptEl, null, "In debug mode, the <script /> element was not included directly");
		notStrictEqual(mathScriptEl, null, "In debug mode, the <script /> element was included with a query string");

		start();
	});
});

asyncTest("In debug mode, calling require for an ID not specified in the dependency array gives a warning in the console", function () {
	var debugModule = window.require("nobleModules/debug");

	debugModule.reset();
	debugModule.enableDebug();

	var recordedWarning = null;
	console.warn = function (warning) {
		recordedWarning = warning;
	};

	// Memoize the math module to simulate e.g. another module specifying it as a dependency and thus it being provided already.
	window.require.memoize("demos/math", [], function () { });

	// Our main module is badly-behaved, because it uses dependencies it doesn't declare.
	// But the require call will not fail, since the module is already provided (as per above); it got lucky.
	// Debug mode should warn about this bad behavior.
	window.module.declare([], function (require, exports, module) {
		require("demos/math");

		strictEqual(recordedWarning, 'The module with ID "demos/math" was not specified in the dependency array for the "" module.');

		start();
	});
});