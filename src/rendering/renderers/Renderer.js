import { RendererDomTarget } from "../RendererDomTarget.js";

/**
 * @template {RendererDomTarget} [TDomTarget = RendererDomTarget]
 * @template {unknown[]} [TDomTargetArgs = []]
 */
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

	/**
	 * @param  {TDomTargetArgs} args
	 */
	createDomTarget(...args) {
		const castConstructor = /** @type {typeof Renderer} */ (this.constructor);
		const DomTarget = /** @type {new (...args: unknown[]) => TDomTarget} */ (castConstructor.domTargetConstructor);
		return new DomTarget(this, ...args);
	}
}
