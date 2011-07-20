(function (global, undefined) {
    var TERM_DELIMITER = "/";
    var CURRENT_DIRECTORY = ".";
    var PARENT_DIRECTORY = "..";
    var MODULE_FILE_EXTENSION = ".js";

    var MAIN_MODULE_ID = "";            // Browser environment: main module's identifier should be the empty string.
    var DEFAULT_MAIN_MODULE_DIR = "";   // Browser environment: paths are relative to main module path, i.e. path of HTML file that does initial module.declare.
    var DEFAULT_IS_IN_DEBUG_MODE = false;

    // Set via require("nobleModules/debug").enableDebug(). Reset to default by require("nobleModules/debug").reset().
    var isInDebugMode = DEFAULT_IS_IN_DEBUG_MODE;

    // Set in reset. Defaults to DEFAULT_MAIN_MODULE_DIR, but can be changed by
    // require("nobleModules/debug").reset(newMainModuleDir).
    var mainModuleDir;

    // An id => object map giving each module's exports. Filled lazily upon first require of a given module.
    var requireMemo;

    // An id => { moduleFactory, dependencies, exports } map that has an entry when a module is currently memoized, but hasn't yet been
    // required by anyone. Exports is added when module is initialized. This is same reference that is passed to the module factory function.
    // Stored here to prevent circular dependency recursion when multiple calls to require are made while initialization of the module is
    // still in progress. Requiring a module will remove it from here and move the exports to requireMemo.
    var pendingDeclarations;

    // An object containing { moduleFactory, dependencies } for the brief period between module.declare being called (in a module's file),
    // and the callback for its <script /> tag's load event firing. Our listener (in module.load below) picks up values from here.
    var scriptTagDeclareStorage = null;

    // The global instances of require and module are stored here and returned in getters, so that we can use Object.defineProperties(global, ...)
    // to prevent users from overwriting global.require and global.module, but still reset them ourselves in the reset function.
    var globalRequire;
    var globalModule;

    ///#region Helper functions and objects
    var warn = (console && console.warn) ? function (warning) { console.warn(warning); } : function () { };

    function getUriFromId(id) {
        return id + MODULE_FILE_EXTENSION;
    }

    var dependencyTracker = (function () {
        var arraysById;
        var extraModuleEnvironmentDependencies;

        function getIdFromPath(path) {
            var idFragments = [];
            path.split(TERM_DELIMITER).forEach(function (pathFragment) {
                if (pathFragment === CURRENT_DIRECTORY || pathFragment.length === 0) {
                    return;
                }

                if (pathFragment === PARENT_DIRECTORY) {
                    if (idFragments.length === 0) {
                        throw new Error("Invalid module path: " + path);
                    }
                    idFragments.pop();
                    return;
                }

                idFragments.push(pathFragment);
            });

            var id = idFragments.join(TERM_DELIMITER);
            if (id.length === 0) {
                throw new Error("Could not create an ID from the path passed in: " + path);
            }
            return id;
        }

        function getDirectoryPortion(moduleId) {
            if (moduleId === MAIN_MODULE_ID || moduleId === undefined) {
                return mainModuleDir;
            }

            var directoryPortion = moduleId.split(TERM_DELIMITER).slice(0, -1).join(TERM_DELIMITER);

            // If empty, return the current directory string, so as to distinguish from empty string.
            // Empty string would denote relative to the HTML file that we are inserting <script /> tags into.
            return directoryPortion || CURRENT_DIRECTORY;
        }

        function getIdFromStringIdentifier(relativeModuleDir, moduleIdentifier) {
            if (moduleIdentifier === MAIN_MODULE_ID) {
                return MAIN_MODULE_ID;
            }

            var path;
            if (moduleIdentifier.indexOf(CURRENT_DIRECTORY + TERM_DELIMITER) === 0 || moduleIdentifier.indexOf(PARENT_DIRECTORY + TERM_DELIMITER) === 0) {
                path = relativeModuleDir + TERM_DELIMITER + moduleIdentifier;
            } else {
                path = mainModuleDir + TERM_DELIMITER + moduleIdentifier;
            }
            return getIdFromPath(path);
        }

        function makeLabelsToIdsMap(moduleDir, dependencies) {
            var map = {};

            dependencies
                .filter(function (dependency) { return typeof dependency === "object"; })
                .forEach(function (labeledDependencyObject) {
                    Object.keys(labeledDependencyObject).forEach(function (label) {
                        var identifier = labeledDependencyObject[label];
                        map[label] = getIdFromStringIdentifier(moduleDir, identifier);
                    });
                });

            return map;
        }

        function isValidDependencyIdentifier(identifier) {
            return typeof identifier === "string";
        }

        function isValidLabeledDependencyObject(object) {
            return typeof object === "object" && Object.keys(object).every(isValidDependencyIdentifier);
        }

        function isValidDependencyArrayEntry(arrayEntry) {
            return isValidDependencyIdentifier(arrayEntry) || isValidLabeledDependencyObject(arrayEntry);
        }

        return {
            reset: function () {
                arraysById = {};
                arraysById[MAIN_MODULE_ID] = [];
                extraModuleEnvironmentDependencies = [];
            },
            setDependenciesFor: function (id, dependencies) {
                if (id === undefined) {
                    Array.prototype.push.apply(extraModuleEnvironmentDependencies, dependencies);
                }

                arraysById[id] = dependencies;
            },
            getDependenciesCopyFor: function (id) {
                return id === undefined ? extraModuleEnvironmentDependencies.slice() : arraysById[id].slice();
            },
            isValidArray: function (dependencies) {
                return dependencies.every(isValidDependencyArrayEntry);
            },
            transformToIdArray: function (dependencies, baseModuleId) {
                var moduleDir = getDirectoryPortion(baseModuleId);

                var ids = [];
                function pushId(identifier) {
                    ids.push(getIdFromStringIdentifier(moduleDir, identifier));
                }

                dependencies.forEach(function (dependency) {
                    if (typeof dependency === "string") {
                        pushId(dependency);
                    } else {
                        Object.keys(dependency)
                            .map(function (label) { return dependency[label]; })
                            .forEach(pushId);
                    }
                });

                return ids;
            },
            getIdFromIdentifier: function (identifier, baseModuleId) {
                var moduleDir = getDirectoryPortion(baseModuleId);

                var labelsToIds = makeLabelsToIdsMap(moduleDir, arraysById[baseModuleId]);
                return labelsToIds.hasOwnProperty(identifier) ? labelsToIds[identifier] : getIdFromStringIdentifier(moduleDir, identifier);
            }
        };
    } ());

    var memoizeListeners = (function () {
        var listeners;

        return {
            reset: function () {
                listeners = {};
            },
            add: function (id, listener) {
                if (listeners.hasOwnProperty(id)) {
                    listeners[id].push(listener);
                } else {
                    listeners[id] = [listener];
                }
            },
            trigger: function (id) {
                if (listeners.hasOwnProperty(id)) {
                    listeners[id].forEach(function (listener) {
                        listener();
                    });
                }
            }
        };
    } ());

    var scriptLoader = (function () {
        // Garbage object map (i.e. we only ever use loadingTracker.hasOwnProperty(uri), never loadingTracker[uri])
        // used to keep track of what is currently loading.
        var loadingTracker;

        // An array of DOM elements for the <script /> tags we insert, so that when we reset the module loader, we can remove them.
        var scriptTagEls = [];

        return {
            reset: function () {
                loadingTracker = {};

                // Remove any <script /> elements we inserted in a previous life.
                scriptTagEls.forEach(function (el) {
                    document.head.removeChild(el);
                });
                scriptTagEls.length = 0;
            },
            isLoading: function (uri) {
                return loadingTracker.hasOwnProperty(uri);
            },
            load: function (uri, onLoaded, onError) {
                if (document.head.querySelector('script[src^="' + uri + '"]') === null) {
                    loadingTracker[uri] = {};

                    var el = document.createElement("script");

                    function onCommon(callback) {
                        delete loadingTracker[uri];

                        el.removeEventListener("load", onScriptLoad, false);
                        el.removeEventListener("error", onScriptError, false);

                        if (typeof callback === "function") {
                            callback();
                        }
                    }
                    function onScriptLoad() {
                        onCommon(onLoaded);
                    }
                    function onScriptError() {
                        onCommon(onError);
                    }

                    el.addEventListener("load", onScriptLoad, false);
                    el.addEventListener("error", onScriptError, false);

                    // If in debug mode, we want to prevent caching, so append a timestamp to the URI. Separate it with underscores so that when
                    // debugging you can visually separate the filename (which you care about) from the timestamp (which you don't care about).
                    el.src = isInDebugMode ? uri + "?___________________________________" + Date.now() : uri;

                    document.head.appendChild(el);
                    scriptTagEls.push(el);
                } else {
                    throw new Error("Tried to load script at " + uri + "; however, the script was already in the DOM.");
                }
            }
        }
    } ());
    //#endregion

    //#region require namespace implementation
    function isMemoizedImpl(id) {
        return pendingDeclarations.hasOwnProperty(id) || requireMemo.hasOwnProperty(id);
    }

    function memoizeImpl(id, dependencies, moduleFactory) {
        pendingDeclarations[id] = { moduleFactory: moduleFactory, dependencies: dependencies };

        // Update our dependency array so that calls to the corresponding require know about any new labels this memoize call introduced.
        dependencyTracker.setDependenciesFor(id, dependencies);
    }

    function requireFactory(originatingId, dependencies) {
        var require = function (moduleIdentifier) {
            if (typeof moduleIdentifier !== "string") {
                throw new TypeError("moduleIdentifier must be a string.");
            }

            var id = dependencyTracker.getIdFromIdentifier(moduleIdentifier, originatingId);

            if (!requireMemo.hasOwnProperty(id) && pendingDeclarations.hasOwnProperty(id)) {
                initializeModule(id);
            }

            if (!requireMemo.hasOwnProperty(id)) {
                throw new Error('Module "' + id + '" has not been provided and is not available.');
            }

            if (isInDebugMode && id !== MAIN_MODULE_ID) {
                var dependencyIdsForDebugWarning = dependencyTracker.transformToIdArray(dependencyTracker.getDependenciesCopyFor(originatingId), originatingId);

                if (dependencyIdsForDebugWarning.indexOf(id) === -1) {
                    warn('The module with ID "' + id + '" was not specified in the dependency array for the "' + originatingId + '" module.');
                }
            }

            return requireMemo[id];
        };

        require.id = function (moduleIdentifier) {
            if (typeof moduleIdentifier !== "string") {
                throw new TypeError("moduleIdentifier must be a string");
            }

            return dependencyTracker.getIdFromIdentifier(moduleIdentifier, originatingId);
        };

        require.uri = function (moduleIdentifier) {
            if (typeof moduleIdentifier !== "string") {
                throw new TypeError("moduleIdentifier must be a string");
            }

            return getUriFromId(dependencyTracker.getIdFromIdentifier(moduleIdentifier, originatingId));
        };

        require.memoize = function (id, dependencies, moduleFactory) {
            if (typeof id !== "string") {
                throw new TypeError("id must be a string.");
            }
            if (!Array.isArray(dependencies)) {
                throw new TypeError("dependencies must be an array.");
            }
            if (typeof moduleFactory !== "function") {
                throw new TypeError("moduleFactory must be a function for " + id + ".");
            }
            if (!dependencyTracker.isValidArray(dependencies)) {
                throw new TypeError("dependencies must be an array of strings or labeled dependency objects.");
            }

            if (isMemoizedImpl(id)) {
                throw new Error(id + "is already provided.");
            }

            memoizeImpl(id, dependencies, moduleFactory);
        };

        require.isMemoized = function (id) {
            if (typeof id !== "string") {
                throw new TypeError("id must be a string.");
            }

            return isMemoizedImpl(id);
        };

        require.displayName = 'require <"' + originatingId + '">';
        require.id.displayName = "require.id";
        require.uri.displayName = "require.uri";
        require.memoize.displayName = "require.memoize";
        require.isMemoized.displayName = "require.isMemoized";


        return Object.freeze(require);
    }
    //#endregion

    //#region Module namespace implementation
    function provideDependenciesThenMemoize(id, dependencies, moduleFactory, onMemoized) {
        // Make the dependency tracker aware that this module has this dependency array.
        // We can't wait for memoizeImpl to do this for us, because that will only happen asynchronously, after script load, whereas if the user
        // calls into the system right after this, he might hit something that depends on the dependency tracker being updated for this module.
        dependencyTracker.setDependenciesFor(id, dependencies);

        function memo() {
            if (!isMemoizedImpl(id)) {
                memoizeImpl(id, dependencies, moduleFactory);
            } else {
                memoizeListeners.trigger(id);
            }
        }

        provideImpl(id, dependencies, function () {
            memo();
            onMemoized();
        });

        memo();
    }

    function initializeModule(id) {
        // If we already set an exports object in pendingDeclarations, then we are in a circular dependency situation.
        // Example: in initializeModule("a"), we do pendingDeclarations["a"].exports = {}, then call moduleFactoryA, which called require("b"),
        // which called initializeModule("b"), which executed moduleFactoryB, which called require("a"), which called initializeModule("a") again,
        // which is where we're at now.
        if (pendingDeclarations[id].exports) {
            // In that case, just use the previously-set exports; we might be only partially initialized, but that's the price you pay
            // for having circular dependencies. And, the caller still gets a reference to the exports, which will be updated as we finish
            // initialize the modules in the circle.
            requireMemo[id] = pendingDeclarations[id].exports;
            return;
        }

        // Grab the moduleFactory and dependencies from pendingDeclarations; this is where we use them up,
        // and we want pendingDeclarations[id] dead ASAP (i.e. before handing off control to user code by calling moduleFactory).
        var moduleFactory = pendingDeclarations[id].moduleFactory;
        var dependencies = pendingDeclarations[id].dependencies;

        // Create a context aware require, a blank exports, and get the appropriate previously-memoized module object, to pass in to moduleFactory.
        var require = requireFactory(id, dependencies);
        var module = new NobleJSModule(id, dependencies);
        var exports = pendingDeclarations[id].exports = {};

        var factoryResult = moduleFactory(require, exports, module);

        // If the moduleFactory initiated a circular require chain (see above), its exports will get stored in requireMemo[id].
        // But if those exports are alternate exports, we won't be able to guarantee that we hand out the same exports reference to everyone,
        // so we need to throw an error.
        if (requireMemo.hasOwnProperty(id) && requireMemo[id] !== exports) {
            throw new Error('Module "' + id + '" contains circular dependencies that return alternate exports instead of using the exports object.');
        }

        // If the module does not return anything, use our exports object; if it does, its exported API is the factory's returned result.
        requireMemo[id] = factoryResult === undefined ? exports : factoryResult;

        // Now that the requireMemo has an entry for this ID, delete the pendingDeclarations entry.
        delete pendingDeclarations[id];
    }

    function initializeMainModule(dependencies, moduleFactory) {
        NobleJSModule.prototype.main = {};
        provideDependenciesThenMemoize(MAIN_MODULE_ID, dependencies, moduleFactory, function onMainModuleMemoized() {
            NobleJSModule.prototype.main = globalRequire(MAIN_MODULE_ID);
        });
    }

    function loadImpl(thisId, moduleIdentifier, onModuleLoaded) {
        var id = dependencyTracker.getIdFromIdentifier(moduleIdentifier, thisId);
        var uri = getUriFromId(id);

        if (scriptLoader.isLoading(uri)) {
            memoizeListeners.add(id, onModuleLoaded);
            return;
        }

        scriptLoader.load(
            uri,
            function onModuleFileLoaded() {
                if (scriptTagDeclareStorage) {
                    // Grab the dependencies and factory from scriptTagDeclareStorage; they were kindly left there for us by module.declare.
                    var dependencies = scriptTagDeclareStorage.dependencies;
                    var moduleFactory = scriptTagDeclareStorage.moduleFactory;
                    scriptTagDeclareStorage = null;

                    provideDependenciesThenMemoize(id, dependencies, moduleFactory, onModuleLoaded);
                } else {
                    // Since this code executes immediately after the file loads, we know that if scriptTagDeclareStorage is still null, either
                    // (a) module.declare must never have been called in the file, and thus never filled scriptTagDeclareStorage for us, or
                    // (b) other module-related things happened after module.declare inside the file.
                    // In both cases: BAD module author! BAD!
                    throw new Error('module.declare was not used inside the module file at URI "' + uri + '", or was not the sole statement.');
                }
            },
            function onError() {
                // The callback must still be called! Calling code depends on it (even within this very file).
                // The module isn't provided though, so for users of the module loader, an error will be encountered
                // when they try to require it.
                onModuleLoaded();
            }
        );
    }

    function provideImpl(thisId, dependencies, onAllProvided) {
        if (dependencies.length === 0) {
            onAllProvided();
            return;
        }

        var dependencyIds = dependencyTracker.transformToIdArray(dependencies, thisId);

        var providedSoFar = [];
        function onDependencyProvided(id) {
            providedSoFar.push(id);

            if (providedSoFar.length === dependencyIds.length) {
                onAllProvided();
            }
        }

        // NOTE: we don't split up the array (e.g. using filter) then separately perform each type of operation,
        // because execution of the loop body could change the memoization status of any given ID.
        dependencyIds.forEach(function (id) {
            var callOnDependencyProvided = function () { onDependencyProvided(id); };

            if (!isMemoizedImpl(id)) {
                loadImpl(thisId, id, callOnDependencyProvided);
            } else {
                callOnDependencyProvided();
            }
        });
    }

    function declareImpl(dependencies, moduleFactory) {
        if (!globalModule.main) {
            // The first time declare is called, there is no main module, so make this one the main module.
            initializeMainModule(dependencies, moduleFactory);
        } else {
            // Otherwise we're inside a <script />-inserted module, so put things in scriptTagDeclareStorage for module.load to play with.
            scriptTagDeclareStorage = { moduleFactory: moduleFactory, dependencies: dependencies };
        }
    }

    function NobleJSModule(id, dependencies) {
        // Not writable or configurable, just enumerable.
        Object.defineProperties(this, {
            id: {
                value: id,
                enumerable: true
            },
            dependencies: {
                get: function () { return dependencyTracker.getDependenciesCopyFor(id); },
                enumerable: true
            }
        });
    }

    NobleJSModule.prototype.declare = function (dependencies, moduleFactory) {
        if (moduleFactory === undefined) {
            moduleFactory = dependencies;
            dependencies = [];
        } else if (!Array.isArray(dependencies)) {
            throw new TypeError("dependencies must be an array");
        }
        if (typeof moduleFactory !== "function") {
            throw new TypeError("moduleFactory must be a function");
        }
        if (!dependencies.every(function (arrayEntry) {
            return typeof arrayEntry === "string" ||
                  (typeof arrayEntry === "object" && Object.keys(arrayEntry).every(function (label) { return typeof arrayEntry[label] === "string"; }));
        })) {
            throw new TypeError("dependencies must be an array of strings or labeled dependency objects.");
        }

        declareImpl(dependencies, moduleFactory);
    };

    NobleJSModule.prototype.load = function (moduleIdentifier, onModuleLoaded) {
        if (typeof moduleIdentifier !== "string") {
            throw new TypeError("moduleIdentifier must be a string.");
        }
        if (typeof onModuleLoaded !== "function") {
            throw new TypeError("onModuleLoaded must be a function.");
        }
        if (!(this instanceof NobleJSModule)) {
            throw new Error('module.load called with incorrect "this" pointer.');
        }

        loadImpl(this.id, moduleIdentifier, onModuleLoaded);
    };

    NobleJSModule.prototype.provide = function (dependencies, onAllProvided) {
        if (!Array.isArray(dependencies)) {
            throw new TypeError("dependencies must be an array.");
        }
        if (typeof onAllProvided !== "function") {
            throw new TypeError("onAllProvided must be a function.");
        }
        if (!dependencyTracker.isValidArray(dependencies)) {
            throw new TypeError("dependencies must be an array of strings or labeled dependency objects.");
        }
        if (!(this instanceof NobleJSModule)) {
            throw new Error('module.provide called with incorrect "this" pointer.');
        }

        provideImpl(this.id, dependencies, onAllProvided);
    };

    NobleJSModule.prototype.eventually = function (functionToCallEventually) {
        if (typeof functionToCallEventually !== "function") {
            throw new TypeError("functionToCallEventually must be a function.");
        }

        // "This function exists to bridge the gap between CommonJS environments that are built on event loops,
        //  and those that are not, for the purposes of writing module provider plug-ins."
        // We are event-loop based, so we don't need to do anything special.
        functionToCallEventually();
    };

    NobleJSModule.prototype.declare.displayName = "module.declare";
    NobleJSModule.prototype.load.displayName = "module.load";
    NobleJSModule.prototype.provide.displayName = "module.provide";
    NobleJSModule.prototype.eventually.displayName = "module.eventually";
    //#endregion

    // A special debugging module with access to our internal state.
    var debugModule = Object.freeze({
        enableDebug: function () {
            isInDebugMode = true;
        },
        reset: reset,
        listModules: function () {
            console.dir(Object.keys(requireMemo).concat(Object.keys(pendingDeclarations)));
        }
    });

    function reset(injectedMainModuleDir) {
        mainModuleDir = injectedMainModuleDir !== undefined ? injectedMainModuleDir : DEFAULT_MAIN_MODULE_DIR;
        if (typeof mainModuleDir !== "string") {
            throw new TypeError("mainModuleDir must be a string.");
        }

        // Reset shared state.
        isInDebugMode = DEFAULT_IS_IN_DEBUG_MODE;
        requireMemo = {};
        pendingDeclarations = {};
        scriptTagDeclareStorage = null;
        memoizeListeners.reset();
        scriptLoader.reset();
        dependencyTracker.reset();

        // Reset the main module; now, the next call to module.declare will declare a new main module.
        NobleJSModule.prototype.main = null;

        // Provide the debug module.
        requireMemo["nobleModules/debug"] = debugModule;

        // Reset the global require and module variables that we return from the global.require and global.module getters.
        globalRequire = requireFactory(MAIN_MODULE_ID, []);
        globalModule = new NobleJSModule(undefined, []);
    }

    function initialize() {
        // Reset is where most of the initialization takes place; it's shared code.
        reset();

        // We use the strategy of accessor descriptors for closure variables that we control, instead of the
        // perhaps-more-obvious approach of using data descriptors, since we need to be able to reset when asked.
        // Since the global require and module should not be configurable, getters are the only way to allow us to
        // change their values in reset(), since a non-configurable data descriptor cannot be re-defined.

        // Note that we explicitly specify false for configurable, to account for the case where e.g. a previous script
        // did global.module = {}. Then the below code would be a *re*definition of global.module, and if we didn't specify,
        // we would inherit the implied configurable: true from the previous script's definition of global.module.
        Object.defineProperties(global, {
            require: {
                get: function () { return globalRequire; },
                enumerable: true,
                configurable: false
            },
            module: {
                get: function () { return globalModule; },
                enumerable: true,
                configurable: false
            }
        });
    }

    initialize();
}(this));
