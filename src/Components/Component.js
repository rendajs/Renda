import defaultComponentTypeManager from "./defaultComponentTypeManager.js";
import Material from "../Rendering/Material.js";
import Mesh from "../Core/Mesh.js";

export default class Component{
	constructor(componentType, propertyValues = {}, {
		componentNamespace = null,
		componentTypeManager = defaultComponentTypeManager
	} = {}){
		this.componentType = componentType;
		this.componentNamespace = componentNamespace;
		this.componentTypeManager = componentTypeManager;
		this.entity = null;

		const componentData = this.getComponentData();
		if(componentData && componentData.properties){
			this.setDefaultValues(componentData.properties);
		}else{
			this.setDefaultValues(null);
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

	toJson({
		assetManager = null,
	} = {}){
		const propertyValues = {};
		const componentData = this.getComponentData();
		if(componentData && componentData.properties){
			for(const [propertyName, property] of Object.entries(componentData.properties)){
				propertyValues[propertyName] = this.propertyToJson(this[propertyName], assetManager);
			}
		}
		const componentJson = {
			type: this.componentType,
			namespace: this.componentNamespace,
			propertyValues,
		};
		if(this.componentNamespace != null){
			componentJson.namespace = this.componentNamespace;
		}
		return componentJson;
	}

	propertyToJson(propertyValue, assetManager = null){
		if(Array.isArray(propertyValue)){
			return propertyValue.map(p => this.propertyToJson(p, assetManager));
		}

		if(assetManager){
			if(propertyValue instanceof Material || propertyValue instanceof Mesh){
				return assetManager.getLiveAssetUuidForAsset(propertyValue);
			}
		}

		return propertyValue;
	}

	getComponentData(){
		return this.componentTypeManager.getComponentData(this.componentType, this.componentNamespace);
	}

	setDefaultValues(properties){
		for(const [propertyName, propertyData] of Object.entries(properties)){
			if(propertyData.defaultValue != undefined){
				this[propertyName] = propertyData.defaultValue;
			}else if(propertyData.type){
				this[propertyName] = new propertyData.type();
			}
		}
	}
}
