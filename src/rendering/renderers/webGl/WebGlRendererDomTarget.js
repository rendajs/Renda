import { RendererDomTarget } from "../../RendererDomTarget.js";

export class WebGlRendererDomTarget extends RendererDomTarget {
	#canvas;
	#ctx;

	/**
	 * @param {import("./WebGlRenderer.js").WebGlRenderer} renderer
	 */
	constructor(renderer) {
		super(renderer);

		this.#canvas = document.createElement("canvas");
		const ctx = this.#canvas.getContext("2d");
		if (!ctx) {
			throw new Error("Failed to create 2d context for canvas");
		}
		this.#ctx = ctx;
		this.width = this.#canvas.width;
		this.height = this.#canvas.height;
	}

	getElement() {
		return this.#canvas;
	}

	/**
	 * @override
	 * @param {number} w Width.
	 * @param {number} h Height.
	 */
	resize(w, h) {
		super.resize(w, h);
		this.#canvas.width = w;
		this.#canvas.height = h;
	}

	/**
	 * @param {HTMLCanvasElement} canvas
	 */
	asdf(canvas) {
		this.#ctx.drawImage(canvas, 0, 0);
	}
}
