import RendererDomTarget from "../RendererDomTarget.js";

export default class Renderer{
	constructor(){
	}

	//optionally override this with your own RendererDomTarget class
	static get domTargetConstructor(){
		return RendererDomTarget;
	}

	init(){}

	render(domTarget, camera){}

	createDomTarget(...args){
		return new this.constructor.domTargetConstructor(this, ...args);
	}
}
