import { WebGpuMaterialMapType } from "./WebGpuMaterialMapType.js";

export class CachedMaterialData {
	#renderer;
	#material;
	/** @type {GPUBindGroupLayout?} */
	#uniformsBindGroupLayout = null;
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
		this.#material = material;

		this.#uniformsBindGroupLayout = null;

		/** @type {Set<import("./PlaceHolderTextureReference.js").PlaceHolderTextureReference>} */
		this.placeHolderTextureRefs = new Set();
	}

	destructor() {
		for (const ref of this.placeHolderTextureRefs) {
			ref.destructor();
		}
		this.placeHolderTextureRefs.clear();
	}

	getUniformsBindGroupLayout() {
		if (!this.#renderer.device) return null;
		if (this.#uniformsBindGroupLayout) return this.#uniformsBindGroupLayout;

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

		for (const { mappedData } of this.#material.getMappedPropertiesForMapType(WebGpuMaterialMapType)) {
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
					sampler: { type: "filtering" },
				});
			}
		}

		this.#uniformsBindGroupLayout = this.#renderer.device.createBindGroupLayout({
			label: "materialUniformsBufferBindGroupLayout",
			entries: bindGroupEntries,
		});
		return this.#uniformsBindGroupLayout;
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

		const uniformsBindGroupLayout = this.getUniformsBindGroupLayout();
		if (!uniformsBindGroupLayout) return null;

		const layout = this.#renderer.device.createPipelineLayout({
			label: "default pipeline layout",
			bindGroupLayouts: [
				this.#renderer.viewBindGroupLayout,
				uniformsBindGroupLayout,
				this.#renderer.objectUniformsBindGroupLayout,
			],
		});

		this.#pipelineLayout = layout;
		return layout;
	}
}
