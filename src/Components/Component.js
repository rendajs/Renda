export default class Component{
	constructor(opts){
		this.entity = null;
	}

	destructor(){
		this.entity = null;
	}

	attachedToEntity(obj){
		this.entity = obj;
		this.onAttachedToEntity(obj);
	}

	onAttachedToEntity(){}
	onParentChanged(){}

	toJson(){
		return {
			type: "Component",
		}
	}
}
