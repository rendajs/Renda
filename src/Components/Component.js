import defaultComponentTypeManager from "./defaultComponentTypeManager.js";
import Material from "../Rendering/Material.js";
import Mesh from "../Core/Mesh.js";
import Vec2 from "../Math/Vec2.js";
import Vec3 from "../Math/Vec3.js";
import Vec4 from "../Math/Vec4.js";
import Mat4 from "../Math/Mat4.js";

/** @unrestricted */
export default class Component{
	constructor(componentType, propertyValues = {}, {
		componentTypeManager = defaultComponentTypeManager
	} = {}){
		this.componentTypeManager = componentTypeManager;

		if(typeof componentType == "string"){
			this.componentUuid = componentType;
		}else{
			const componentData = this.componentTypeManager.getComponentFromData(componentType);
			if(!componentData){
				throw new Error("Unable to create new component type");
			}
			this.componentUuid = componentData.uuid;
		}
		this.entity = null;

		const componentData = this.getComponentData();
		if(componentData && componentData.properties){
			this.setDefaultValues(componentData.properties);
		}

		for(const [propertyName, propertyValue] of Object.entries(propertyValues)){
			this[propertyName] = propertyValue;
		}
	}

	destructor(){
		this.entity = null;
	}

	attachedToEntity(ent){
		this.entity = ent;
	}

	toJson(editorOpts = null){
		const propertyValues = {};
		const componentData = this.getComponentData();
		if(componentData && componentData.properties){
			for(const [propertyName, property] of Object.entries(componentData.properties)){
				propertyValues[propertyName] = this.propertyToJson(this, propertyName, editorOpts);
			}
		}
		const componentJson = {
			uuid: this.componentUuid,
			propertyValues,
		};
		return componentJson;
	}

	propertyToJson(object, propertyName, editorOpts){
		const propertyValue = object[propertyName];
		if(Array.isArray(propertyValue)){
			const mappedArray = [];
			for(const i of propertyValue.keys()){
				mappedArray[i] = this.propertyToJson(propertyValue, i, editorOpts);
			}
			return mappedArray;
		}

		//todo, use a global list of math types
		if(propertyValue instanceof Vec2 || propertyValue instanceof Vec3 || propertyValue instanceof Vec4){
			return propertyValue.toArray();
		}else if(propertyValue instanceof Mat4){
			return propertyValue.getFlatArray();
		}

		//todo, strip this code using defines
		if(propertyValue && editorOpts && editorOpts.usedAssetUuidsSymbol && editorOpts.assetManager && editorOpts.assetTypeManager && editorOpts.assetTypeManager.constructorHasAssetType(propertyValue.constructor)){
			const usedAssetUuids = object[editorOpts.usedAssetUuidsSymbol];
			if(usedAssetUuids){
				const assetUuid = usedAssetUuids[propertyName];
				if(assetUuid) return assetUuid;
			}

			const projectAsset = editorOpts.assetManager.getProjectAssetForLiveAsset(propertyValue);
			if(projectAsset){
				return projectAsset.uuid;
			}else{
				return null;
			}
		}

		return propertyValue;
	}

	getComponentData(){
		return this.componentTypeManager.getComponentDataForUuid(this.componentUuid);
	}

	setDefaultValues(properties){
		for(const [propertyName, propertyData] of Object.entries(properties)){
			if(propertyData.defaultValue != undefined){
				this[propertyName] = propertyData.defaultValue;
			}else if(propertyData.type instanceof Array){
				this[propertyName] = propertyData.type[0];
			}else if(propertyData.type == Vec2 || propertyData.type == Vec3 || propertyData.type == Vec3 || propertyData.type == Mat4){ //todo, use a global list of math types
				this[propertyName] = new propertyData.type();
			}else{
				this[propertyName] = null;
			}
		}
	}
}
