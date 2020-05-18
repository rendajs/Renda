import Component from "./Components/Component.js";
import {Vector3, Quaternion, Mat4} from "./Math/Math.js";

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

		this.localMatrixDirty = false;
		this.boundMarkLocalMatrixDirty = this.markLocalMatrixDirty.bind(this);
		this.worldMatrixDirty = false;
		this._localMatrix = new Mat4();
		this._worldMatrix = new Mat4();
		this._pos = new Vector3();
		this._pos.onChange(this.boundMarkLocalMatrixDirty);
		this._rot = new Quaternion();
		this._rot.onChange(this.boundMarkLocalMatrixDirty);
		this._scale = Vector3.one;
		this._scale.onChange(this.boundMarkLocalMatrixDirty);

		this.setParent(opts.parent, false);
	}

	destructor(){
		this.setParent(null, false);
		for(const child of this._children){
			child.destructor();
		}
		this._children = null;
		for(const component of this.components){
			component.destructor();
		}
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

	get pos(){
		return this._pos;
	}

	set pos(value){
		this._pos.set(value);
	}

	get rot(){
		return this._rot;
	}

	set rot(value){
		this._rot.set(value);
	}

	get scale(){
		return this._scale;
	}

	set scale(value){
		this._scale.set(value);
	}

	get localMatrix(){
		if(this.localMatrixDirty){
			this._localMatrix = Mat4.createPosRotScale(this.pos, this.rot, this.scale);
		}
		return this._localMatrix;
	}

	get worldMatrix(){
		if(this.localMatrixDirty || this.worldMatrixDirty){
			if(this.parent){
				this._worldMatrix = Mat4.multiplyMatrices(this.parent.worldMatrix, this.localMatrix);
			}else{
				this._worldMatrix = this.localMatrix.clone();
			}
		}
		return this._worldMatrix;
	}

	markLocalMatrixDirty(){
		this.localMatrixDirty = true;
	}

	setParent(newParent, keepWorldPosition = false){
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

	add(child, keepWorldPosition = false){
		child.setParent(this, keepWorldPosition);
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

	*traverseDown(){
		yield this;
		for(const child of this._children){
			for(const c of child.traverseDown()){
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

	toJson(){
		let json = {
			name: this.name,
			matrix: this._localMatrix.getAsArray(),
			components: [],
			children: [],
		}
		for(const component of this.components){
			json.components.push(component.toJson());
		}
		for(const child of this.getChildren()){
			json.children.push(child.toJson());
		}
		return json;
	}
}
