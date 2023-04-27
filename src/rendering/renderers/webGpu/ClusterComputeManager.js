import {ShaderBuilder} from "../../ShaderBuilder.js";

export class ClusterComputeManager {
	/**
	 * @param {import("../../../components/builtIn/CameraComponent.js").CameraComponent} camera
	 * @param {import("./CachedCameraData.js").CachedCameraData} cachedCameraData
	 */
	constructor(camera, cachedCameraData) {
		this.camera = camera;
		this.cachedCameraData = cachedCameraData;
		this.renderer = this.cachedCameraData.renderer;

		/** @type {WeakRef<import("../../ClusteredLightsConfig.js").ClusteredLightsConfig>?} */
		this.lastUsedConfig = null;

		this.computeBoundsPipeline = null;
		this.boundsBuffer = null;
		this.boundsBindGroup = null;

		this.computeLightIndicesPipeline = null;
		this.lightIndicesBuffer = null;
	}

	get config() {
		return this.camera.clusteredLightsConfig;
	}

	/**
	 * @returns {boolean} True if the config is ready to be used.
	 */
	createComputeObjects() {
		if (!this.renderer.device) return false;
		if (!this.renderer.viewBindGroupLayout) return false;
		if (!this.renderer.computeClusterBoundsBindGroupLayout) return false;
		if (!this.renderer.computeClusterLightsBindGroupLayout) return false;
		if (!this.renderer.computeClusterBoundsShaderCode) return false;
		if (!this.renderer.computeClusterLightsShaderCode) return false;
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

		return true;
	}

	/**
	 * @param {GPUCommandEncoder} commandEncoder
	 * @returns {boolean} True if the indices were sucesfully computed.
	 */
	computeLightIndices(commandEncoder) {
		const ready = this.createComputeObjects();
		if (!ready) return false;
		if (!this.computeBoundsPipeline) return false;
		if (!this.boundsBindGroup) return false;
		if (!this.config) return false;

		const computePassEncoder = commandEncoder.beginComputePass();

		// todo, don't compute when the camera projection matrix or cluster count hasn't changed
		const viewBindGroup = this.cachedCameraData.getViewBindGroup();
		if (!viewBindGroup) return false;
		computePassEncoder.setPipeline(this.computeBoundsPipeline);
		computePassEncoder.setBindGroup(0, viewBindGroup);
		computePassEncoder.setBindGroup(1, this.boundsBindGroup);
		computePassEncoder.dispatchWorkgroups(this.config.clusterCount.x, this.config.clusterCount.y, this.config.clusterCount.z);

		if (this.computeLightIndicesPipeline && this.cachedCameraData.viewBindGroup) {
			computePassEncoder.setPipeline(this.computeLightIndicesPipeline);
			computePassEncoder.setBindGroup(0, this.cachedCameraData.viewBindGroup);
			computePassEncoder.dispatchWorkgroups(this.config.clusterCount.x, this.config.clusterCount.y, this.config.clusterCount.z);
		}

		computePassEncoder.end();

		return true;
	}
}
