import autoRegisterAssetTypes from "../ProjectAssetType/AutoRegisterAssetTypes.js";
import ProjectAssetType from "../ProjectAssetType/ProjectAssetType.js";

export default class ProjectAssetTypeManager{
	constructor(){
		this.registeredAssetTypes = new Map();
	}

	init(){
		for(const t of autoRegisterAssetTypes){
			this.registerAssetType(t);
		}
	}

	registerAssetType(constructor){
		if(!(constructor.prototype instanceof ProjectAssetType)){
			console.warn("Tried to register project asset type ("+constructor.name+") that does not extend ProjectAssetType class.");
			return;
		}
		if(constructor.type == null){
			console.warn("Tried to register project asset type ("+constructor.name+") with no type value, override the static type value in order for this content type to function properly");
			return;
		}

		this.registeredAssetTypes.set(constructor.type, constructor);
	}

	getAssetType(type){
		return this.registeredAssetTypes.get(type);
	}
}
