import {WebGpuMaterialMapType} from "./WebGpuMaterialMapType.js";

export class CachedMaterialData {
	#renderer;
	#device;
	/** @type {import("./WebGpuPipelineConfig.js").WebGpuPipelineConfig?} */
	#forwardPipelineConfig = null;
	/** @type {GPUPipelineLayout?} */
	#pipelineLayout = null;

	/**
	 * @param {import("./WebGpuRenderer.js").WebGpuRenderer} renderer
	 */
	constructor(renderer) {
		this.#renderer = renderer;
		if (!renderer.device) {
			throw new Error("Cannot create material data without a WebGpu device.");
		}
		this.#device = renderer.device;

		this.uniformsBindGroupLayout = null;

		/** @type {Set<import("./PlaceHolderTextureReference.js").PlaceHolderTextureReference>} */
		this.placeHolderTextureRefs = new Set();
	}

	destructor() {
		for (const ref of this.placeHolderTextureRefs) {
			ref.destructor();
		}
		this.placeHolderTextureRefs.clear();
	}

	/**
	 * @param {import("../../Material.js").Material} material
	 */
	getForwardPipelineConfig(material) {
		if (this.#forwardPipelineConfig) return this.#forwardPipelineConfig;

		if (!material.materialMap) return null;
		const webgpuMap = material.materialMap.getMapTypeInstance(WebGpuMaterialMapType);
		if (!webgpuMap) return null;
		const config = webgpuMap.forwardPipelineConfig;

		this.#forwardPipelineConfig = config;
		return config;
	}

	/**
	 * @param {import("../../Material.js").Material} material
	 */
	getPipelineLayout(material) {
		if (this.#pipelineLayout) return this.#pipelineLayout;

		if (!this.#renderer.device) return null;
		if (!this.#renderer.viewBindGroupLayout) return null;
		if (!this.#renderer.objectUniformsBindGroupLayout) return null;

		/** @type {GPUBindGroupLayoutEntry[]} */
		const bindGroupEntries = [];
		bindGroupEntries.push({
			binding: bindGroupEntries.length,
			visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
			buffer: {
				type: "uniform",
				hasDynamicOffset: true,
			},
		});

		for (const {mappedData} of material.getMappedPropertiesForMapType(WebGpuMaterialMapType)) {
			if (mappedData.mappedType == "texture2d") {
				bindGroupEntries.push({
					binding: bindGroupEntries.length,
					visibility: GPUShaderStage.FRAGMENT,
					texture: {
						sampleType: "float",
						viewDimension: "2d",
					},
				});
			} else if (mappedData.mappedType == "sampler") {
				bindGroupEntries.push({
					binding: bindGroupEntries.length,
					visibility: GPUShaderStage.FRAGMENT,
					sampler: {type: "filtering"},
				});
			}
		}

		this.uniformsBindGroupLayout = this.#device.createBindGroupLayout({
			label: "materialUniformsBufferBindGroupLayout",
			entries: bindGroupEntries,
		});

		const layout = this.#renderer.device.createPipelineLayout({
			label: "default pipeline layout",
			bindGroupLayouts: [
				this.#renderer.viewBindGroupLayout,
				this.uniformsBindGroupLayout,
				this.#renderer.objectUniformsBindGroupLayout,
			],
		});

		this.#pipelineLayout = layout;
		return layout;
	}
}
