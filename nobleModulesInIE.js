/* nobleModulesInIE.js
 *
 * Copyright (c) 2011 Barnesandnoble.com, llc
 * Released under MIT license (see https://github.com/NobleJS/Noble-Modules/blob/master/MIT-LICENSE.txt)
 */
 (function () {
    // NOTE: requires jQuery; we didn't want to implement XHR and promises ourselves.

    // We detect IE by the presence of onreadystatechange on script, assuming that if IE ever removes this,
    // they will start using the load/error events the same way as everyone else.
    var isIE = document.createElement("script").onreadystatechange === null;
    if (!isIE) {
        return;
    }
    
    if (!module.constructor.prototype.load) {
        throw new Error("The Modules/2.0 implementation in use does not support module provider plug-ins.");
    }

    var loadPromises = {};

    // Override load to use jQuery's XHR to grab the script, then eval() it.
    module.constructor.prototype.load = function (moduleIdentifier, onModuleLoaded) {
        var id = require.id(moduleIdentifier);
        var uri = require.uri(id);

        // Only do the loading once, but store a promise so that future calls to module.load execute the module.declare (as per the spec) and get their callbacks called.
        if (!Object.prototype.hasOwnProperty.call(loadPromises, id)) {
            loadPromises[id] = jQuery.ajax({ url: uri, dataType: "text" });
        }

        loadPromises[id]
            .success(function (data) {
                eval(data);
                onModuleLoaded();
            })
            .error(onModuleLoaded);
    };
}());
