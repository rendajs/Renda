import {WebGpuMaterialMapType} from "./WebGpuMaterialMapType.js";

export class CachedMaterialData {
	#renderer;
	#device;
	#material;
	/** @type {import("./WebGpuPipelineConfig.js").WebGpuPipelineConfig?} */
	#forwardPipelineConfig = null;
	/** @type {GPUPipelineLayout?} */
	#pipelineLayout = null;

	/**
	 * @param {import("./WebGpuRenderer.js").WebGpuRenderer} renderer
	 * @param {import("../../Material.js").Material} material
	 */
	constructor(renderer, material) {
		this.#renderer = renderer;
		if (!renderer.device) {
			throw new Error("Cannot create material data without a WebGpu device.");
		}
		this.#device = renderer.device;
		this.#material = material;

		this.uniformsBindGroupLayout = null;
	}

	getForwardPipelineConfig() {
		if (this.#forwardPipelineConfig) return this.#forwardPipelineConfig;

		if (!this.#material.materialMap) return null;
		const webgpuMap = this.#material.materialMap.getMapTypeInstance(WebGpuMaterialMapType);
		if (!webgpuMap) return null;
		const config = webgpuMap.forwardPipelineConfig;

		this.#forwardPipelineConfig = config;
		return config;
	}

	getPipelineLayout() {
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
		// TODO: This sampler is temporary until sampler assets are added.
		bindGroupEntries.push({
			binding: bindGroupEntries.length,
			visibility: GPUShaderStage.FRAGMENT,
			sampler: {type: "filtering"},
		});

		for (const {mappedData} of this.#material.getMappedPropertiesForMapType(WebGpuMaterialMapType)) {
			if (mappedData.mappedType == "texture2d") {
				bindGroupEntries.push({
					binding: bindGroupEntries.length,
					visibility: GPUShaderStage.FRAGMENT,
					texture: {
						sampleType: "float",
						viewDimension: "2d",
					},
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
