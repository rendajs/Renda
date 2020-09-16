import autoRegisterAssetTypes from "./ProjectAssetType/AutoRegisterAssetTypes.js";
import ProjectAssetType from "./ProjectAssetType/ProjectAssetType.js";

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
			constructor.invalidConfigurationWarning("Tried to register project asset type ("+constructor.name+") with no type value, override the static type value in order for this asset type to function properly.");
			return;
		}
		if(!constructor.type.includes(":") || constructor.type.split(":")[0].length <= 0){
			constructor.invalidConfigurationWarning("Tried to register project asset type ("+constructor.name+") without a namespace in the type value.");
			return;
		}
		if(constructor.typeUuid == null){
			constructor.invalidConfigurationWarning("Tried to register project asset type ("+constructor.name+") without a valid typeUuid, override the static typeUuid value in order for this asset type to function properly.");
			return;
		}

		this.registeredAssetTypes.set(constructor.type, constructor);
	}

	getAssetType(type){
		return this.registeredAssetTypes.get(type);
	}
}
