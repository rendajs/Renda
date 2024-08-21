/**
 * @typedef ViewUniformLocations
 * @property {WebGLUniformLocation?} viewProjectionMatrix
 */
/**
 * @typedef ModelUniformLocations
 * @property {WebGLUniformLocation?} mvpMatrix
 */

import { parseAttributeLocations as parseTaggedAttributeLocations } from "./glslParsing.js";

export class CachedProgramData {
	#program;
	get program() {
		return this.#program;
	}

	/** @type {ViewUniformLocations?} */
	#viewUniformLocations = null;
	/** @type {ModelUniformLocations?} */
	#modelUniformLocations = null;

	/** @type {Map<string, WebGLUniformLocation?>} */
	#materialUniformLocations = new Map();

	/** @type {Map<number, string>} */
	#taggedAttributeLocations = new Map();

	/**
	 * @param {WebGLRenderingContext} gl
	 * @param {import("../../ShaderSource.js").ShaderSource} vertexShaderSource
	 * @param {import("../../ShaderSource.js").ShaderSource} fragmentShaderSource
	 * @param {WebGLShader} vertexShader
	 * @param {WebGLShader} fragmentShader
	 */
	constructor(gl, vertexShaderSource, fragmentShaderSource, vertexShader, fragmentShader) {
		const program = gl.createProgram();
		if (!program) throw new Error("Failed to create program");

		const taggedAttributeLocations = parseTaggedAttributeLocations(vertexShaderSource.source);
		for (const {identifier, location} of taggedAttributeLocations) {
			if (this.#taggedAttributeLocations.has(location)) {
				throw new Error(`Shader contains multiple attributes tagged with @location(${location})`);
			}
			this.#taggedAttributeLocations.set(location, identifier);
		}

		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			throw new Error(`Failed to link shader program: ${gl.getProgramInfoLog(program)}`);
		}

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

	/**
	 * @param {WebGLRenderingContext} gl
	 * @param {number} taggedShaderLocation The id that the attribute was tagged
	 * with in the shader using a `@location` comment.
	 */
	getAttribLocation(gl, taggedShaderLocation) {
		const identifier = this.#taggedAttributeLocations.get(taggedShaderLocation);
		if (!identifier) {
			// If no identifier with this shader location was found in the vertex shader, this could either be because:
			// - the user forgot to tag it with a @location comment
			// - or because the attribute is not used at all.
			// In the first case we should ideally throw an error, in the second case we should do nothing.
			// However, there's no easy way for us to detect if an attribute is unused, so we'll just
			// return -1, this will cause the renderer to not bind the attribute buffer.
			return -1;
		}

		return gl.getAttribLocation(this.#program, identifier);
	}
}
