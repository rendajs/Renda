import {Renderer} from "./mod.js";

export class RendererDomTarget {
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

	/**
	 * @param {import("../Components/BuiltIn/CameraComponent.js").default} camera
	 */
	render(camera) {
		if (this.width <= 0 || this.height <= 0) {
			// If we try to render while the size is invalid, all sorts of things might break.
			// This check should solve a lot of issues but implementations should still make sure to
			// that nothing breaks when 0 is passed as one of the `resize()` parameters.
			// Ideally implementations destroy all textures to preserve memory in such a case
			// and create them again once the size is valid again.
			return;
		}
		this.renderer.render(this, camera);
	}
}
