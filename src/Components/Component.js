import ComponentProperty from "./ComponentProperties/ComponentProperty.js";
import ComponentPropertyFloat from "./ComponentProperties/ComponentPropertyFloat.js";

export default class Component{
	constructor(opts){
		this.entity = null;
		this._componentProperties = new Map();
	}

	static get componentName(){
		return null; //should be overridden by inherited class
	}

	destructor(){
		this.entity = null;
	}

	attachedToEntity(ent){
		this.entity = ent;
		this.onAttachedToEntity(ent);
	}

	onAttachedToEntity(){}
	onParentChanged(){}

	toJson(){
		return {
			type: "Component",
		}
	}

	setComponentProperties(properties){
		let objectProperties = {};
		for(const [propertyName, propertySettings] of Object.entries(properties)){
			let oldValue = this[propertyName];
			propertySettings.value = oldValue;
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
		if(propertyType == "float"){
			return new ComponentPropertyFloat(settings);
		}else{
			return new ComponentProperty(settings);
		}
	}
}
