/*global QUnit */

(function qUnitAugmentations(global, undefined) {
    function makeModuleTestBasedOn(qunitTestFunction) {
        return function (testName, mainModuleFactoryFunction) {
            qunitTestFunction(testName, function () {
                global.module.declare([], mainModuleFactoryFunction);
            });
        };
    }
    
    // I don't care that it makes my tests nondeterministic; it'd be great to get failure instead of hanging the test process when an async call doesn't return.
    // E.g. with script loading, the error event only fires in WebKit, but I'd like to know that it fails in Firefox etc. and still be able to execute my other tests.
    global.asyncTest = function (testName, testFunc) {
        QUnit.test(testName, function () {
            QUnit.stop(5 * 1000);
            testFunc();
        });
    };

    global.moduleTest = makeModuleTestBasedOn(QUnit.test);
    global.asyncModuleTest = makeModuleTestBasedOn(global.asyncTest);

    global.newTestSet = function (name) {
        /// <summary>Wraps QUnit.module, passing it the same lifecycle every time (namely a setup that resets the module loader),
        /// and makes things clearer so that the term "module" is not overloaded as much.</summary>

        QUnit.module(
            name,
            {
                setup: function () {
                    global.require("nobleModules/debug").enableDebug();
                },
                teardown: function () {
                    global.require("nobleModules/debug").reset();
                }
            }
        );
    };
}(this));

(function stateValidationAssertions(global, undefined) {
    global.assertNotWritable = function (readFunction, writeFunction, propertyName) {
        var initialValue = readFunction();

        try {
            writeFunction();

            // In non-strict mode the property simply will not change.
            QUnit.deepEqual(readFunction(), initialValue, propertyName + " did not change even when we tried setting it to something else");
        } catch (error) {
            // In strict mode a TypeError should be thrown.
            if (error instanceof TypeError) {
                QUnit.ok(true, "A TypeError was thrown while trying to set " + propertyName + " to something else");
            } else {
                throw error;
            }
        }
    };

    global.assertNotConfigurable = function (readFunction, deleteFunction, propertyName) {
        var initialValue = readFunction();

        try {
            deleteFunction();

            // In non-strict mode the property will simply not be deleted.
            QUnit.deepEqual(readFunction(), initialValue, propertyName + " was not deleted even when we tried");
        } catch (error) {
            // In strict mode a TypeError should be thrown.
            if (error instanceof TypeError) {
                QUnit.ok(true, "A TypeError was thrown while trying to delete " + propertyName);
            } else {
                throw error;
            }
        }
    };

    global.assertNotExtensible = function (object, objectName) {
        try {
            object.asdf = "qwerty";

            // In non-strict mode the property will simply not appear.
            QUnit.strictEqual(object.hasOwnProperty("asdf"), false, "A property was not added to " + objectName + " even when we tried");
        } catch (error) {
            // In strict mode a TypeError should be thrown.
            if (error instanceof TypeError) {
                QUnit.ok(true, "A TypeError was thrown while trying to add a property to " + objectName);
            } else {
                throw Error;
            }
        }
    };

    global.assertDisallowsUnboundThis = function (unboundMethod, methodName) {
        QUnit.raises(
            unboundMethod,
            new RegExp(methodName + ' called with incorrect "this" pointer\\.'),
            "The appropriate error was thrown when trying to call " + methodName + " from an unbound alias."
        );
    };
}(this));

(function argumentValidationAssertions(global, undefined) {
    // We only support argument validation of these types, for now.
    var representativesOfTypes = {
        "Function": function () { },
        "Array": [],
        "String": "a string",
        "Number": 5,
        "Boolean": true
    };

    // IE doesn't seem to have a name property on functions, so we need this.
    function getTypeName(type) {
        if (type === Function) { return "Function"; }
        else if (type === Array) { return "Array"; }
        else if (type === String) { return "String"; }
        else if (type === Number) { return "Number"; }
        else if (type === Boolean) { return "Boolean"; }
        else { throw new Error("Not a supported constructor function"); }
    }

    function stringStartsWith(string, potentialStart) {
        return string.substr(0, potentialStart.length) === potentialStart;
    }

    function toStringForOutput(testData) {
        // Don't convert anything but non-null objects; string concatenation coerces null, undefined, Function instances, etc. just great.
        return typeof testData === "object" && testData !== null ? "object " + JSON.stringify(testData)
             : typeof testData === "string" ? '"' + testData + '"'
             : testData + "";
    }

    global.assertArgumentValidated = function (shouldThrow, desiredType, paramName, allowNull, allowUndefined) {
        /// <param name="shouldThrow" type="Function">A one-parameter function (usually created using partial application) that should throw when passed something not of desiredType.</param>
        /// <param name="desiredType" type="Function">A constructor function denoting the type that must be passed to avoid TypeErrors.</param>
        /// <param name="paramName" type="String">The parameter name of shouldThrow that must match desiredType to avoid TypeErrors.</param>

        function validateErrorObject(error) {
            // This helps distinguish between TypeErrors thrown by the runtime and ones that come explicitly from parameter validation.
            return error instanceof TypeError && stringStartsWith(error.message, paramName + " must be");
        }

        function runTheTest(testData) {
            QUnit.raises(
                function () { shouldThrow(testData); },
                validateErrorObject,
                "Must pass a " + getTypeName(desiredType) + " as " + paramName + "; attempted " + toStringForOutput(testData)
            );
        }

        var mismatched1 = desiredType === Function ? 5 : function () { };
        var mismatched2 = desiredType === String ? {} : "hello";
        runTheTest(mismatched1);
        runTheTest(mismatched2);

        if (!allowNull) {
            runTheTest(null);
        }
        if (!allowUndefined) {
            runTheTest(undefined);
        }
    };

    global.assertArgumentsValidated = function (functionUnderTest, parametersMap) {
        /// <summary>Used for the most common case of argument validation, when neither null nor undefined are allowed for any parameter and there are no optional arguments.</summary>
        /// <param name="functionUnderTest" type="Function">The function to test all parameters of.</param>
        /// <param name="parametersMap" type="Object">A map from parameter names to constructor functions.
        /// The parameter names are used in the assertion output and to validate that the TypeErrors thrown are in the correct format.
        /// The constructor functions correspond to the desired type for that parameter.</param>

        var validParams = Object.keys(parametersMap).map(function (paramName) {
            var typeName = getTypeName(parametersMap[paramName]);
            return representativesOfTypes[typeName];
        });

        Object.keys(parametersMap).forEach(function (name, i) {
            var type = parametersMap[name];

            function withOtherParamsFilledValidly(valueForParamUnderTest) {
                var paramsThisTime = validParams.slice();
                paramsThisTime[i] = valueForParamUnderTest;

                return functionUnderTest.apply(null, paramsThisTime);
            }

            global.assertArgumentValidated(withOtherParamsFilledValidly, type, name);
        });
    };

    global.assertArrayArgumentValidated = function (shouldThrow, desiredElementType, paramName) {
        function validateErrorObject(error) {
            // This helps distinguish between TypeErrors thrown by the runtime and ones that come explicitly from parameter validation.
            return error instanceof TypeError && stringStartsWith(error.message, paramName + " must be");
        }

        function runTheTest(testData) {
            QUnit.raises(
                function () { shouldThrow(testData); },
                validateErrorObject,
                "Must pass an array containing only " + getTypeName(desiredElementType) + " elements as " + paramName + "; attempted [" + testData.map(toStringForOutput) + "]"
            );
        }

        var matched = representativesOfTypes[getTypeName(desiredElementType)];
        var mismatched1 = desiredElementType === Function ? 5 : function () { };
        var mismatched2 = desiredElementType === String ? {} : "hello";

        var mismatchedArrays = [
            [matched, mismatched1],
            [matched, mismatched2],
            [matched, null],
            [matched, undefined]
        ];

        mismatchedArrays.forEach(runTheTest);
    };
} (this));