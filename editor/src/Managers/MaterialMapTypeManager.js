import autoRegisterMaterialMapTypes from "../MaterialMapTypes/AutoRegisterMaterialMapTypes.js";
import MaterialMapType from "../MaterialMapTypes/MaterialMapType.js";

export default class MaterialMapTypeManager{
	constructor(){
		this.registeredMapTypes = new Set();
	}

	init(){
		for(const t of autoRegisterMaterialMapTypes){
			this.registerMapType(t);
		}
	}

	registerMapType(constructor){
		if(!(constructor.prototype instanceof MaterialMapType)){
			console.warn("Tried to register a MaterialMapType type ("+constructor.name+") that does not extend MaterialMapType class.");
			return;
		}

		this.registeredMapTypes.add(constructor);
	}
}
