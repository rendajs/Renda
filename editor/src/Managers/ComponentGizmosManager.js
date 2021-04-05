import autoRegisterComponentGizmos from "../ComponentGizmos/AutoRegisterComponentGizmos.js";
import ComponentGizmos from "../ComponentGizmos/ComponentGizmos.js";
import {defaultComponentTypeManager} from "../../../../src/index.js";

export default class ComponentGizmosManager{
	constructor(){
		this.componentGizmos = new Map(); //Map<namespace, Map<componentType, ComponentGizmos>>
	}

	init(){
		for(const componentGizmos of autoRegisterComponentGizmos){
			this.registerComponentGizmos(componentGizmos);
		}
	}

	registerComponentGizmos(constructor){
		if(!(constructor.prototype instanceof ComponentGizmos)){
			console.warn("Tried to register ComponentGizmos ("+constructor.name+") that does not extend ComponentGizmos class.");
			return;
		}

		if(constructor.componentType == null){
			constructor.invalidConfigurationWarning("Failed to register ComponentGizmos ("+constructor.name+") componentType value not set.");
			return;
		}

		let namespace = this.componentGizmos.get(constructor.componentNamespace);
		if(!namespace){
			namespace = new Map();
			this.componentGizmos.set(constructor.componentNamespace, namespace);
		}

		namespace.set(constructor.componentType, constructor);
	}

	getComponentGizmos(componentType, namespace = null){
		if(namespace == null){
			for(const namespaceObj of this.componentGizmos.values()){
				let componentGizmos = namespaceObj.get(componentType);
				if(componentGizmos) return componentGizmos;
			}
			return null;
		}else{
			const namespaceObj = this.componentGizmos.get(namespace);
			if(!namespaceObj) return null;
			return namespaceObj.get(componentType);
		}
	}

	createComponentGizmosInstance(componentType, namespace, component, gizmoManager){
		const constructor = this.getComponentGizmos(componentType, namespace);
		if(!constructor) return null;
		return new constructor(component, gizmoManager);
	}
}
