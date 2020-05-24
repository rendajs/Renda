export default class Component{
	constructor(opts){
		this.entity = null;
	}

	static get componentName(){
		return null; //should be overridden by inherited class
	}

	destructor(){
		this.entity = null;
	}

	attachedToEntity(ent){
		this.entity = ent;
		this.onAttachedToEntity(ent);
	}

	onAttachedToEntity(){}
	onParentChanged(){}

	toJson(){
		return {
			type: "Component",
		}
	}
}
