import {RendererDomTarget} from "../RendererDomTarget.js";

export class Renderer {
	// optionally override this with your own RendererDomTarget class
	static get domTargetConstructor() {
		return RendererDomTarget;
	}

	async init() {}

	/**
	 * Renders a scene from a camera to a dom target.
	 * @param {RendererDomTarget} domTarget
	 * @param {import("../../components/builtIn/CameraComponent.js").CameraComponent} camera
	 */
	render(domTarget, camera) {}

	createDomTarget(...args) {
		const castConstructor = /** @type {typeof Renderer} */ (this.constructor);
		const DomTarget = castConstructor.domTargetConstructor;
		return new DomTarget(this, ...args);
	}
}
