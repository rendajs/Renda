import Component from "./components/Component.js";
import Mat4 from "./math/Mat4.js";

export default class GameObject{
	constructor(opts){
		if(typeof opts == "string"){
			opts = {
				name: opts,
			}
		}
		opts = {...{
			name: "",
			parent: null,
		}, ...opts}
		this.name = opts.name;
		this._parent = null;
		this._children = [];
		this.components = [];

		this.localMatrix = new Mat4();
		this.worldMatrix = new Mat4();

		this.setParent(opts.parent, false);
	}

	addComponent(component){
		//if argument is a component type constructor instead of an instance,
		//instantiate a new instance of this type
		if(component.prototype instanceof Component){
			component = new component();
		}

		if(!component instanceof Component){
			throw new Error("component argument is not of type Component");
		}

		this.components.push(component);
		component.attachedToObject(this);
		return component;
	}

	*getComponentsByType(type){
		for(const component of this.components){
			if(component instanceof type){
				yield component;
			}
		}
	}

	get parent(){
		return this._parent;
	}

	set parent(newParent){
		this.setParent(newParent);
	}

	setParent(newParent, keepPosition = true){
		if(this._parent){
			this._parent._children = this._parent._children.filter(c => c != this);
		}
		this._parent = newParent;
		if(newParent){
			newParent._children.push(this);
		}
		for(const component of this.components){
			component.onParentChanged();
		}
	}

	add(child, keepPosition = true){
		child.setParent(this, keepPosition);
	}

	remove(child){
		if(child.parent != this) return;
		child.setParent(null);
	}

	*getChildren(){
		for(const child of this._children){
			yield child;
		}
	}

	get children(){
		return Array.from(this.getChildren());
	}

	getRoot(){
		let lastParent = this;
		while(true){
			if(lastParent.parent){
				lastParent = lastParent.parent;
			}else{
				break;
			}
		}
		return lastParent;
	}

	*traverse(){
		yield this;
		for(const child of this._children){
			for(const c of child.traverse()){
				yield c;
			}
		}
	}

	getObjectByIndicesPath(indexPath, startFrom = 0){
		if(startFrom >= indexPath.length) return this;
		let index = indexPath[startFrom];
		let child = this.children[index];
		return child.getObjectByIndicesPath(indexPath, startFrom + 1);
	}
}
