import {ComponentProperty} from "./ComponentProperties/ComponentProperties.js";
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
		this._componentProperties = new Map();

		const componentData = this.getComponentData();
		this.setComponentProperties(componentData?.properties);

		for(const [propertyName, propertyValue] of Object.entries(propertyValues)){
			let property = this._componentProperties.get(propertyName);
			property.setValue(propertyValue);
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

	setComponentProperties(properties){
		if(!properties) return;
		let objectProperties = {};
		for(const [propertyName, propertySettings] of Object.entries(properties)){
			let componentProperty = this.generateComponentProperty(propertySettings);
			this._componentProperties.set(propertyName, componentProperty);
			objectProperties[propertyName] = {
				get: _ => {
					return componentProperty.getValue();
				},
				set: val => {
					componentProperty.setValue(val);
				},
				configurable: true,
			}
		}
		Object.defineProperties(this, objectProperties);
	}

	generateComponentProperty(settings){
		let propertyType = settings.type || "float";
		if(typeof propertyType == "string"){
			propertyType = propertyType.toLowerCase();
			propertyType = defaultComponentTypeManager.getComponentProperty(propertyType);
			if(!propertyType){
				propertyType = ComponentProperty;
			}
		}
		return new propertyType(settings);
	}
}
