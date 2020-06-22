import defaultComponentTypeManager from "./defaultComponentTypeManager.js";

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
		this.setDefaultValues(componentData?.properties);

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

	toJson(){
		const propertyValues = {};
		for(const [propertyName, property] of this._componentProperties){
			propertyValues[propertyName] = property.getValue();
		}
		const componentJson = {
			type: this.componentType,
			propertyValues,
		};
		if(this.componentNamespace != null){
			componentJson.namespace = this.componentNamespace;
		}
		return componentJson;
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
