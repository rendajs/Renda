import Component from "./components/Component.js";

export default class GameObject{
	constructor(){
		this.components = [];
	}

	addComponent(component){
		if(!component instanceof Component){
			throw new Error("component argument is not of type Component");
		}

		this.components.push(component);
		component.attachedToObject(this);
	}
}
