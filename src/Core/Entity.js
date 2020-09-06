import {Vec3, Quaternion, Mat4} from "../Math/Math.js";
import {Component, defaultComponentTypeManager} from "../Components/Components.js";

export default class Entity{
	constructor(opts){
		if(typeof opts == "string"){
			opts = {
				name: opts,
			}
		}
		opts = {...{
			name: "Entity",
			matrix: null,
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
		this._pos = new Vec3();
		this._pos.onChange(this.boundMarkLocalMatrixDirty);
		this._rot = new Quaternion();
		this._rot.onChange(this.boundMarkLocalMatrixDirty);
		this._euler = new Vec3();
		this._euler.onChange(this.boundMarkLocalMatrixDirty);
		this._scale = Vec3.one;
		this._scale.onChange(this.boundMarkLocalMatrixDirty);

		this.setParent(opts.parent, false);

		if(opts.matrix) this.localMatrix = opts.matrix;
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

		//todo: remove transformation listeners from rot pos scale etc
	}

	addComponent(component){
		if(!(component instanceof Component)){
			component = new Component(...arguments);
		}

		this.components.push(component);
		component.attachedToEntity(this);
		return component;
	}

	*getComponentsByType(type, namespace = defaultComponentTypeManager.defaultNamespace, componentTypeManager = defaultComponentTypeManager){
		for(const component of this.components){
			if(component.componentType == type && component.componentTypeManager == componentTypeManager){
				if(namespace && component.componentNamespace != namespace) continue;
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

	get euler(){
		return this._euler;
	}

	set euler(value){
		this.rot = Quaternion.fromEuler(value);
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
			this.localMatrixDirty = false;
		}
		return this._localMatrix;
	}

	set localMatrix(value){
		this._localMatrix.set(value);
		const {pos, rot, scale} = this._localMatrix.decompose();
		this.pos = pos;
		this.rot = rot;
		this.scale = scale;
		this.localMatrixDirty = false;
		this.worldMatrixDirty = true;
	}

	get worldMatrix(){
		if(this.localMatrixDirty || this.worldMatrixDirty){
			if(this.parent){
				this._worldMatrix = Mat4.multiplyMatrices(this.parent.worldMatrix, this.localMatrix);
			}else{
				this._worldMatrix = this.localMatrix.clone();
			}
			this.worldMatrixDirty = false;
		}
		return this._worldMatrix;
	}

	markLocalMatrixDirty(){
		this.localMatrixDirty = true;
		for(const child of this.traverseDown()){
			child.worldMatrixDirty = true;
		}
	}

	setParent(newParent, keepWorldPosition = false){
		if(this._parent){
			this._parent._children = this._parent._children.filter(c => c != this);
		}
		this._parent = newParent;
		if(newParent){
			newParent._children.push(this);
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

	getEntityByIndicesPath(indexPath, startFrom = 0){
		if(startFrom >= indexPath.length) return this;
		let index = indexPath[startFrom];
		let child = this.children[index];
		return child.getEntityByIndicesPath(indexPath, startFrom + 1);
	}

	toJson({
		assetManager = null,
	} = {}){
		let json = {
			name: this.name,
			matrix: this._localMatrix.getFlatArray(),
			components: [],
			children: [],
		}
		for(const component of this.components){
			json.components.push(component.toJson({assetManager}));
		}
		for(const child of this.getChildren()){
			json.children.push(child.toJson({assetManager}));
		}
		if(json.components.length <= 0) delete json.components;
		if(json.children.length <= 0) delete json.children;
		return json;
	}
}
