import {autoRegisterComponentProperties} from "./ComponentProperties/ComponentProperties.js";
import ComponentProperty from "./ComponentProperties/ComponentProperty.js";

export default class ComponentTypeManager{
	constructor(){
		this.namespaces = new Map();

		this.getNamespace(this.defaultNamespace);
		this.getNamespace(this.userNamespace);

		for(const property of autoRegisterComponentProperties){
			this.registerComponentProperty(property, this.defaultNamespace);
		}
	}

	getNamespace(namespace, creationOpts = {}){
		let namespaceObj = this.namespaces.get(namespace);
		if(namespaceObj) return namespaceObj;
		namespaceObj = {
			componentTypes: new Map(),
			propertyTypes: new Map(),
		}
		this.namespaces.set(namespace, namespaceObj);
		this.sortNamespaces();
		return namespaceObj;
	}

	sortNamespaces(){
		this.namespaces = new Map([...this.namespaces.entries()].sort((a, b) => {
			if(a[0] == this.defaultNamespace || b[0] == this.userNamespace) return 1;
			if(b[0] == this.defaultNamespace || a[0] == this.userNamespace) return -1;
		}));
	}

	registerComponentType(type, componentData, namespace = this.userNamespace){
		const namespaceObj = this.getNamespace(namespace);
		namespaceObj.componentTypes.set(type, componentData);
	}

	registerComponentProperty(property, namespace = this.userNamespace){
		if(!(property.prototype instanceof ComponentProperty)){
			console.warn("Tried to register component property that is not an instance of ComponentProperty: ",property.name);
			return;
		}

		const typeStr = property.getTypeStr();
		if(!typeStr){
			console.warn("Failed to register component property because its getTypeStr method is not implemented", property.name);
			return;
		}

		const namespaceObj = this.getNamespace(namespace);
		namespaceObj.propertyTypes.set(typeStr, property);
	}

	get defaultNamespace(){
		return 0;
	}

	get userNamespace(){
		return 1;
	}

	getComponentData(type, namespace = null){
		if(namespace == null){
			for(const namespaceObj of this.namespaces.values()){
				let componentData = namespaceObj.componentTypes.get(type);
				if(componentData) return componentData;
			}
			return null;
		}else{
			return this.namespaces.get(namespace)?.componentTypes.get(type);
		}
	}

	getComponentProperty(type, namespace = null){
		if(namespace == null){
			for(const namespaceObj of this.namespaces.values()){
				let property = namespaceObj.propertyTypes.get(type);
				if(property) return property;
			}
			return null;
		}else{
			return this.namespaces.get(namespace)?.propertyTypes.get(type);
		}
	}

	*getAllComponents(){
		for(const [namespace, namespaceObj] of this.namespaces){
			for(const [type, componentData] of namespaceObj.componentTypes){
				yield {namespace, type, componentData};
			}
		}
	}
}
