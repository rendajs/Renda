/**
 * @typedef WebGlBlendConfig
 * @property {number} srcFactor
 * @property {number} dstFactor
 * @property {number} [srcFactorAlpha]
 * @property {number} [dstFactorAlpha]
 */

export class WebGlMaterialConfig {
	/**
	 * @param {object} options
	 * @param {import("../../ShaderSource.js").ShaderSource?} [options.fragmentShader]
	 * @param {import("../../ShaderSource.js").ShaderSource?} [options.vertexShader]
	 * @param {number} [options.renderOrder]
	 * @param {boolean} [options.depthWriteEnabled]
	 * @param {WebGlBlendConfig} [options.blend]
	 */
	constructor({
		fragmentShader = null,
		vertexShader = null,
		renderOrder = 0,
		depthWriteEnabled = true,
		blend,
	} = {}) {
		this.fragmentShader = fragmentShader;
		this.vertexShader = vertexShader;
		this.renderOrder = renderOrder;
		this.depthWriteEnabled = depthWriteEnabled;
		this.blend = blend || null;
	}
}
