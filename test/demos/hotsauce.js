module.declare([], function(require, exports, module) {
	var hotSauces = ['tabasco', 'franks', 'cholula packets'];
	
	Object.defineProperties(exports, {
		hotSaucesAvailable: {
			value: hotSauces,
			enumerable: true,
		},		
		teamFavorite: { 
			value: hotSauces[0],
			enumerable: true	
		}
	});
	
	exports.addNewHotSauce = function (hotsauceId) {
		hotSauces.push(hotsauceId);
	};
	
	exports.isBottleEmpty = function () {
		return false; // we would never let that happen
	};	
})
