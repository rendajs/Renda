export default class ComponentTypeManager{
	constructor(){
		this.namespaces = new Map();

		this.getNamespace(this.builtInNamespace);
		this.getNamespace(this.userNamespace);
	}

	getNamespace(namespace, creationOpts = {}){
		let namespaceObj = this.namespaces.get(namespace);
		if(namespaceObj) return namespaceObj;
		namespaceObj = {
			componentTypes: new Map(),
		}
		this.namespaces.set(namespace, namespaceObj);
		this.sortNamespaces();
		return namespaceObj;
	}

	sortNamespaces(){
		this.namespaces = new Map([...this.namespaces.entries()].sort((a, b) => {
			if(a[0] == this.builtInNamespace || b[0] == this.userNamespace) return 1;
			if(b[0] == this.builtInNamespace || a[0] == this.userNamespace) return -1;
		}));
	}

	registerComponentType(type, componentData, namespace = this.userNamespace){
		const namespaceObj = this.getNamespace(namespace);
		if(componentData && componentData.properties){
			for(const [propertyName, property] of Object.entries(componentData.properties)){
				if(!property.type && property.defaultValue != undefined){
					if(typeof property.defaultValue == "number"){
						property.type = Number;
					}else{
						property.type = property.defaultValue.constructor;
					}
				}
			}
		}
		namespaceObj.componentTypes.set(type, componentData);
	}

	get builtInNamespace(){
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
			const namespaceObj = this.namespaces.get(namespace);
			if(!namespaceObj) return null;
			return namespaceObj.componentTypes.get(type);
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
