export default class Component{
	constructor(opts){
		this.gameObject = null;
	}

	destructor(){
		this.gameObject = null;
	}

	attachedToObject(obj){
		this.gameObject = obj;
		this.onAttachedToObject(obj);
	}

	onAttachedToObject(){}
	onParentChanged(){}

	toJson(){
		return {
			type: "Component",
		}
	}
}
