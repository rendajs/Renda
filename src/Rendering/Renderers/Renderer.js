import RendererDomTarget from "../RendererDomTarget.js";

export default class Renderer {
	// optionally override this with your own RendererDomTarget class
	static get domTargetConstructor() {
		return RendererDomTarget;
	}

	async init() {}

	render(domTarget, camera) {}

	createDomTarget(...args) {
		const castConstructor = /** @type {typeof Renderer} */ (this.constructor);
		const DomTarget = castConstructor.domTargetConstructor;
		return new DomTarget(this, ...args);
	}
}
