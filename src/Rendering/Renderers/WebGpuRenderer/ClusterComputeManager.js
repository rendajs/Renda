import {ShaderBuilder} from "../../ShaderBuilder.js";

export class ClusterComputeManager {
	/**
	 * @param {import("../../../Components/BuiltIn/CameraComponent.js").CameraComponent} camera
	 * @param {import("./CachedCameraData.js").CachedCameraData} cachedCameraData
	 */
	constructor(camera, cachedCameraData) {
		this.camera = camera;
		this.cachedCameraData = cachedCameraData;
		this.renderer = this.cachedCameraData.renderer;

		this.lastUsedConfig = null;

		this.computeBoundsPipeline = null;
		this.boundsBuffer = null;
		this.boundsBindGroup = null;

		this.computeLightIndicesPipeline = null;
		this.lightIndicesBuffer = null;
		this.lightIndicesBindGroup = null;
	}

	get config() {
		return this.camera.clusteredLightsConfig;
	}

	/**
	 * @returns {boolean} True if the config is ready to be used.
	 */
	createComputeObjects() {
		if (this.lastUsedConfig) {
			const ref = this.lastUsedConfig.deref();
			if (ref) {
				if (this.config == ref) return true;
			}
		}
		if (!this.config) return false;
		this.lastUsedConfig = new WeakRef(this.config);

		// todo: destroy old buffers etc
		this.computeBoundsPipeline = this.renderer.device.createComputePipeline({
			label: "ClusteredComputeManager computeBoundsPipeline",
			layout: this.renderer.device.createPipelineLayout({
				label: "ClusteredComputeManager computeBoundsPipelineLayout",
				bindGroupLayouts: [
					this.renderer.viewBindGroupLayout,
					this.renderer.computeClusterBoundsBindGroupLayout,
				],
			}),
			compute: {
				module: this.renderer.device.createShaderModule({
					label: "ClusteredComputeManager computeBoundsShaderModule",
					code: ShaderBuilder.fillShaderDefines(this.renderer.computeClusterBoundsShaderCode.source, this.config.getShaderDefines()),
				}),
				entryPoint: "main",
			},
		});

		this.boundsBuffer = this.renderer.device.createBuffer({
			label: "ClusteredComputeManager boundsBuffer",
			size: this.config.totalClusterCount * 32,
			usage: GPUBufferUsage.STORAGE,
		});

		this.boundsBindGroup = this.renderer.device.createBindGroup({
			label: "ClusteredComputeManager boundsBindGroup",
			layout: this.renderer.computeClusterBoundsBindGroupLayout,
			entries: [
				{
					binding: 0,
					resource: {
						buffer: this.boundsBuffer,
					},
				},
			],
		});

		this.computeLightIndicesPipeline = this.renderer.device.createComputePipeline({
			layout: this.renderer.device.createPipelineLayout({
				label: "ClusteredComputeManager computeLightIndicesPipeline",
				bindGroupLayouts: [
					this.renderer.viewBindGroupLayout,
					this.renderer.computeClusterLightsBindGroupLayout,
				],
			}),
			compute: {
				module: this.renderer.device.createShaderModule({
					label: "ClusteredComputeManager computeLightIndicesShaderModule",
					code: ShaderBuilder.fillShaderDefines(this.renderer.computeClusterLightsShaderCode.source, this.config.getShaderDefines()),
				}),
				entryPoint: "main",
			},
		});

		this.lightIndicesBuffer = this.renderer.device.createBuffer({
			label: "ClusteredComputeManager lightIndicesBuffer",
			size: (this.config.maxLightsPerClusterPass * 4 + 4) * this.config.totalClusterCount,
			usage: GPUBufferUsage.STORAGE,
		});

		// todo: this bindgroup is unnecessary, the indices binding
		// from the viewBindGroupLayout can be used instead
		this.lightIndicesBindGroup = this.renderer.device.createBindGroup({
			label: "ClusteredComputeManager lightIndicesBindGroup",
			layout: this.renderer.computeClusterLightsBindGroupLayout,
			entries: [
				{
					binding: 0,
					resource: {
						buffer: this.boundsBuffer,
					},
				},
				{
					binding: 1,
					resource: {
						buffer: this.lightIndicesBuffer,
					},
				},
			],
		});

		return true;
	}

	/**
	 * @param {GPUCommandEncoder} commandEncoder
	 * @returns {boolean} True if the indices were sucesfully computed.
	 */
	computeLightIndices(commandEncoder) {
		const ready = this.createComputeObjects();
		if (!ready) return false;

		// todo, don't compute when the camera projection matrix or cluster count hasn't changed
		const computePassEncoder = commandEncoder.beginComputePass();
		computePassEncoder.setPipeline(this.computeBoundsPipeline);
		computePassEncoder.setBindGroup(0, this.cachedCameraData.getViewBindGroup());
		computePassEncoder.setBindGroup(1, this.boundsBindGroup);
		computePassEncoder.dispatch(this.config.clusterCount.x, this.config.clusterCount.y, this.config.clusterCount.z);
		// computePassEncoder.endPass();

		// const computePassEncoder = commandEncoder.beginComputePass();
		computePassEncoder.setPipeline(this.computeLightIndicesPipeline);
		computePassEncoder.setBindGroup(0, this.cachedCameraData.viewBindGroup);
		computePassEncoder.setBindGroup(1, this.lightIndicesBindGroup);
		computePassEncoder.dispatch(this.config.clusterCount.x, this.config.clusterCount.y, this.config.clusterCount.z);
		computePassEncoder.endPass();

		return true;
	}
}
