import Component from "./components/Component.js";

export default class GameObject{
	constructor(opts){
		opts = {...{
			name: "",
			parent: null,
		}, ...opts}
		this.name = opts.name;
		this._parent = null;
		this.parent = opts.parent;
		this._children = [];
		this.components = [];
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
		if(newParent){
			newParent.add(this, keepPosition);
		}else{
			this._parent = null;
		}
	}

	add(child, keepPosition = true){
		if(child._parent){
			child._parent.remove(child);
		}
		child._parent = this;
		this._children.push(child);
	}

	remove(child){
		this._children = this._children.filter(c => c != child);
		child._parent = null;
	}

	*children(){
		for(const child of this._children){
			yield child;
		}
	}

	getChildren(){
		return Array.from(this.children());
	}
}
