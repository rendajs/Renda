export default class Component{
	constructor(opts){
		this.entity = null;
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
