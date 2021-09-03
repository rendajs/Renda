import RendererDomTarget from "../RendererDomTarget.js";

export default class Renderer{
	constructor(){
	}

	//optionally override this with your own RendererDomTarget class
	static get domTargetConstructor(){
		return RendererDomTarget;
	}

	async init(){}

	render(domTarget, camera){}

	createDomTarget(...args){
		const castConstructor = /** @type {typeof Renderer} */ (this.constructor);
		return new castConstructor.domTargetConstructor(this, ...args);
	}
}
