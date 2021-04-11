import defaultComponentTypeManager from "./defaultComponentTypeManager.js";
import Material from "../Rendering/Material.js";
import Mesh from "../Core/Mesh.js";
import Vec2 from "../Math/Vec2.js";
import Vec3 from "../Math/Vec3.js";
import Vec4 from "../Math/Vec4.js";
import Mat4 from "../Math/Mat4.js";

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
		return this.componentTypeManager.getComponentData(this.componentType, this.componentNamespace);
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
