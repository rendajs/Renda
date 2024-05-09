/**
 * @typedef ViewUniformLocations
 * @property {WebGLUniformLocation?} viewProjectionMatrix
 */
/**
 * @typedef ModelUniformLocations
 * @property {WebGLUniformLocation?} mvpMatrix
 */

export class CachedProgramData {
	#program;

	/** @type {ViewUniformLocations?} */
	#viewUniformLocations = null;
	/** @type {ModelUniformLocations?} */
	#modelUniformLocations = null;

	/** @type {Map<string, WebGLUniformLocation?>} */
	#materialUniformLocations = new Map();

	/**
	 * @param {WebGLProgram} program
	 */
	constructor(program) {
		this.#program = program;
	}

	/**
	 * @param {WebGLRenderingContext} gl
	 */
	getViewUniformLocations(gl) {
		if (this.#viewUniformLocations) return this.#viewUniformLocations;

		this.#viewUniformLocations = {
			viewProjectionMatrix: gl.getUniformLocation(this.#program, "viewUniforms.viewProjectionMatrix"),
		};
		return this.#viewUniformLocations;
	}

	/**
	 * @param {WebGLRenderingContext} gl
	 */
	getModelUniformLocations(gl) {
		if (this.#modelUniformLocations) return this.#modelUniformLocations;

		this.#modelUniformLocations = {
			mvpMatrix: gl.getUniformLocation(this.#program, "modelUniforms.mvpMatrix"),
		};
		return this.#modelUniformLocations;
	}

	/**
	 * @param {WebGLRenderingContext} gl
	 * @param {string} name
	 */
	getMaterialUniformLocation(gl, name) {
		if (this.#materialUniformLocations.has(name)) {
			return this.#materialUniformLocations.get(name) || null;
		}

		const location = gl.getUniformLocation(this.#program, `materialUniforms_${name}`);
		this.#materialUniformLocations.set(name, location);
		return location;
	}
}
