import {Renderer} from "./Rendering.js";

export default class RendererDomTarget {
	/**
	 * @param {Renderer} renderer
	 * @param {...*} extra
	 */
	constructor(renderer, ...extra) {
		this.renderer = renderer;
		this.width = 0;
		this.height = 0;
	}

	destructor() {}

	getElement() {
		return null;
	}

	/**
	 * @param {number} w Width.
	 * @param {number} h Height.
	 */
	resize(w, h) {
		this.width = w;
		this.height = h;
	}

	render(camera) {
		this.renderer.render(this, camera);
	}
}
