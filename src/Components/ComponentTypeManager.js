import ComponentTypes from "./ComponentTypes.js";

export default class ComponentTypeManager{
	constructor(){
		this.namespaces = new Map();

		this.getNamespace(this.defaultNamespace);
		this.getNamespace(this.userNamespace);
	}

	getNamespace(namespace, creationOpts = {}){
		let namespaceMap = this.namespaces.get(namespace);
		if(namespaceMap) return namespaceMap;
		namespaceMap = new Map();
		this.namespaces.set(namespace, namespaceMap);
		this.sortNamespaces();
		return namespaceMap;
	}

	sortNamespaces(){
		this.namespaces = new Map([...this.namespaces.entries()].sort((a, b) => {
			if(a[0] == this.defaultNamespace || b[0] == this.userNamespace) return 1;
			if(b[0] == this.defaultNamespace || a[0] == this.userNamespace) return -1;
		}));
	}

	registerComponentType(type, componentData, namespace = this.userNamespace){
		const namespaceMap = this.getNamespace(namespace);
		namespaceMap.set(type, componentData);
	}

	get defaultNamespace(){
		return 0;
	}

	get userNamespace(){
		return 1;
	}

	getComponentData(type, namespace = null){
		if(namespace == null){
			for(const namespace of this.namespaces.values()){
				let componentData = namespace.get(type);
				if(componentData) return componentData;
			}
			return null;
		}else{
			return this.namespaces.get(namespace)?.get(type);
		}
	}

	*getAllComponents(){
		for(const [namespace, namespaceData] of this.namespaces){
			for(const [type, componentData] of namespaceData){
				yield {namespace, type, componentData};
			}
		}
	}
}
