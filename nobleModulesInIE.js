(function () {
    var isIE = document.createElement("script").onreadystatechange === null;
    if (!isIE) {
        return;
    }
    
    if (!module.constructor.prototype.load) {
        throw new Error("The Modules/2.0 implementation in use does not support module provider plug-ins.");
    }

    var loadingMemo = {};

    module.constructor.prototype.load = function (moduleIdentifier, onModuleLoaded) {
        var id = require.id(moduleIdentifier);
        if (!loadingMemo.hasOwnProperty(id)) {
            loadingMemo[id] = jQuery.ajax({ url: require.uri(id), dataType: "text" });
        }

        loadingMemo[id]
            .success(function (data) {
                eval(data);
                onModuleLoaded();
            })
            .error(onModuleLoaded);
    };
}());
