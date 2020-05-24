import {autoRegisterComponents, Component} from "../../../src/index.js";

export default class ComponentTypeManager{
	constructor(){
		this.registeredComponents = new Map();
	}

	init(){
		for(const component of autoRegisterComponents){
			this.registerComponent(component);
		}
	}

	registerComponent(constructor){
		if(!(constructor.prototype instanceof Component)){
			console.warn("Tried to register component type ("+constructor.name+") that does not extend Component class.");
			return;
		}

		if(constructor.componentName == null){
			console.warn("Tried to register component ("+constructor.name+") with no component name, override the static componentName property in order for this component to function properly");
			return;
		}

		this.registeredComponents.set(constructor.componentName, constructor);
	}
}
