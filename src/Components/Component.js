import defaultComponentTypeManager from "./defaultComponentTypeManager.js";
import Material from "../Rendering/Material.js";
import Mesh from "../Core/Mesh.js";
import Vec2 from "../Math/Vec2.js";
import Vec3 from "../Math/Vec3.js";
import Vec4 from "../Math/Vec4.js";
import Mat4 from "../Math/Mat4.js";

export default class Component{
	constructor(componentType, propertyValues = {}, {
		componentTypeManager = defaultComponentTypeManager
	} = {}){
		this.componentTypeManager = componentTypeManager;

		if(typeof componentType == "string"){
			this.componentUuid = componentUuid;
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
			uuid: this.componentUuid,
			propertyValues,
		};
		return componentJson;
	}

	propertyToJson(propertyValue, assetManager = null){
		if(Array.isArray(propertyValue)){
			return propertyValue.map(p => this.propertyToJson(p, assetManager));
		}

		if(propertyValue instanceof Vec2 || propertyValue instanceof Vec3 || propertyValue instanceof Vec4){
			return propertyValue.toArray();
		}else if(propertyValue instanceof Mat4){
			return propertyValue.getFlatArray();
		}

		if(assetManager){
			if(propertyValue instanceof Material || propertyValue instanceof Mesh){
				const projectAsset = assetManager.getProjectAssetForLiveAsset(propertyValue);
				if(projectAsset){
					return projectAsset.uuid;
				}else{
					return null;
				}
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
			}else if(propertyData.type){
				this[propertyName] = new propertyData.type();
			}
		}
	}
}
