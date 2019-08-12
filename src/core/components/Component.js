export default class Component{
	constructor(opts){
		this.attachedObject = null;
	}

	attachedToObject(obj){
		this.attachedObject = obj;
		this.onAttachedToObject(obj);
	}

	onAttachedToObject(){}
	onParentChanged(){}
}
