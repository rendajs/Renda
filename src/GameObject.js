import Component from "./components/Component.js";

export default class GameObject{
	constructor(opts){
		opts = {...{
			name: "",
			parent: null,
		}, ...opts}
		this.name = opts.name;
		this._parent = null;
		this._children = [];
		this.components = [];

		this.setParent(opts.parent, false);
	}

	addComponent(component){
		if(!component instanceof Component){
			throw new Error("component argument is not of type Component");
		}

		this.components.push(component);
		component.attachedToObject(this);
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
}
