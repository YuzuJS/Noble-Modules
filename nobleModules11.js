(function () {
    if (!module.constructor.prototype.load) {
        throw new Error("The Modules/2.0 implementation in use does not support module provider plug-ins.");
    }

    // Maps ids to jQuery promises for loading that script.
    var loadPromises = {};

    // TODO: document requireRegExp and consider whether or not declareRegExp should be more like requireRegExp.
    // Both borrowed from BravoJS at http://code.google.com/p/bravojs/source/browse/plugins/jquery-loader/jquery-loader.js
    var declareRegExp = /(^|[\r\n])\s*module.declare\s*\(/;
    var requireRegExp = /\/\/.*|\/\*[\s\S]*?\*\/|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|[;=(,:!^]\s*\/(?:\\.|[^\/\\])+\/|(?:^|\W)\s*require\s*\(\s*("(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*')\s*\)/g;

    // Borrowed from BravoJS, which says "mostly borrowed from FlyScript."
    function scrapeDependenciesFrom(rawSource) {
        var dependencies = [];

        var result = null;
        while ((result = requireRegExp.exec(rawSource)) !== null) {
            if (result[1]) {
                dependencies.push(result[1]);
            }
        }

        return dependencies;
    }

    // See http://blog.getfirebug.com/2009/08/11/give-your-eval-a-name-with-sourceurl/
    function makeSourceUrlString(uri) {
        return "\n//@ sourceURL=" + uri;
    }

    function makeSourceToEvalFor20(uri, rawSource) {
        return rawSource + makeSourceUrlString(uri);
    }

    function makeSourceToEvalFor11(uri, rawSource) {
        var dependencies = scrapeDependenciesFrom(rawSource);

        return "module.declare([" + dependencies.join(", ") + "], function (require, exports, module) {\n" + rawSource + "\n})" + makeSourceUrlString(uri);
    }

    function evalModule(rawSource, uri) {
        var sourceUrlEnding = "\n//@ sourceURL=" + uri;

        if (rawSource.match(declareRegExp)) {
            eval(makeSourceToEvalFor20(uri, rawSource));
        } else {
            eval(makeSourceToEvalFor11(uri, rawSource));
        }
    }

    module.constructor.prototype.load = function (moduleIdentifier, onModuleLoaded) {
        var id = require.id(moduleIdentifier);
        var uri = require.uri(id);

        // Only do the loading once, but store a promise so that future calls to module.load execute the module.declare (as per the spec) and get their callbacks called.
        if (!Object.prototype.hasOwnProperty.call(loadPromises, id)) {
            loadPromises[id] = jQuery.ajax({ url: uri, dataType: "text" });
        }

        loadPromises[id]
            .success(function (data) {
                evalModule(data, uri);
                onModuleLoaded();
            })
            .error(onModuleLoaded);
    };
}());
