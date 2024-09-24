import { RendererDomTarget } from "../../RendererDomTarget.js";

export class WebGlRendererDomTarget extends RendererDomTarget {
	#canvas;
	#ctx;

	/** @type {Set<() => void>} */
	#onResizeCbs = new Set();

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
		this.#onResizeCbs.forEach((cb) => cb());
	}

	/**
	 * Registers a callback that is fired when `resize` is called.
	 * @param {() => void} cb
	 */
	onResize(cb) {
		this.#onResizeCbs.add(cb);
	}

	/**
	 * @param {HTMLCanvasElement} canvas
	 */
	drawImage(canvas) {
		this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
		this.#ctx.drawImage(canvas, 0, 0);
	}
}
