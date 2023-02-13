import {ENABLE_WEBGPU_CLUSTERED_LIGHTS} from "../../../studioDefines.js";
import {ClusterComputeManager} from "./ClusterComputeManager.js";

export class CachedCameraData {
	/**
	 * @param {import("../../../components/builtIn/CameraComponent.js").CameraComponent} camera
	 * @param {import("./WebGpuRenderer.js").WebGpuRenderer} renderer
	 */
	constructor(camera, renderer) {
		this.camera = camera;
		this.renderer = renderer;

		if (ENABLE_WEBGPU_CLUSTERED_LIGHTS) {
			this.clusterComputeManager = new ClusterComputeManager(camera, this);
			/** @type {WeakRef<import("../../ClusteredLightsConfig.js").ClusteredLightsConfig>?} */
			this.lastUsedClusterConfig = null;
		}

		this.viewBindGroup = null;
	}

	testViewBindGroupDirty() {
		if (!ENABLE_WEBGPU_CLUSTERED_LIGHTS) return false;
		if (this.lastUsedClusterConfig) {
			const ref = this.lastUsedClusterConfig.deref();
			if (ref) {
				if (this.camera.clusteredLightsConfig == ref) return false;
			}
		}
		if (!this.camera.clusteredLightsConfig) return false;
		this.lastUsedClusterConfig = new WeakRef(this.camera.clusteredLightsConfig);
		return true;
	}

	getViewBindGroup() {
		if (!this.renderer.device) return null;
		if (!this.renderer.viewBindGroupLayout) return null;
		if (!this.renderer.viewUniformsBuffer) return null;
		if (!this.renderer.lightsBuffer) return null;

		if (!this.viewBindGroup || this.testViewBindGroupDirty()) {
			/** @type {GPUBindGroupEntry[]} */
			const entries = [
				this.renderer.viewUniformsBuffer.getCurrentChunk().createBindGroupEntry({binding: 0}),
				this.renderer.lightsBuffer.getCurrentChunk().createBindGroupEntry({binding: 1}),
			];
			if (ENABLE_WEBGPU_CLUSTERED_LIGHTS && this.clusterComputeManager?.lightIndicesBuffer) {
				entries.push({
					binding: 2,
					resource: {
						buffer: this.clusterComputeManager.lightIndicesBuffer,
					},
				});
			}
			this.viewBindGroup = this.renderer.device.createBindGroup({
				label: "viewBindGroup",
				layout: this.renderer.viewBindGroupLayout,
				entries,
			});
		}
		return this.viewBindGroup;
	}
}
