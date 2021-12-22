import {ENABLE_WEBGPU_CLUSTERED_LIGHTS} from "../../../engineDefines.js";
import {ClusterComputeManager} from "./ClusterComputeManager.js";

export class CachedCameraData {
	/**
	 * @param {import("../../../Components/BuiltIn/CameraComponent.js").CameraComponent} camera
	 * @param {import("./WebGpuRenderer.js").WebGpuRenderer} renderer
	 */
	constructor(camera, renderer) {
		this.camera = camera;
		this.renderer = renderer;

		if (ENABLE_WEBGPU_CLUSTERED_LIGHTS) {
			this.clusterComputeManager = new ClusterComputeManager(camera, this);
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
		this.lastUsedClusterConfig = new WeakRef(this.camera.clusteredLightsConfig);
		return true;
	}

	getViewBindGroup() {
		if (!this.viewBindGroup || this.testViewBindGroupDirty()) {
			this.viewBindGroup = this.renderer.device.createBindGroup({
				label: "viewBindGroup",
				layout: this.renderer.viewBindGroupLayout,
				entries: [
					this.renderer.viewUniformsBuffer.getCurrentChunk().createBindGroupEntry({binding: 0}),
					this.renderer.lightsBuffer.getCurrentChunk().createBindGroupEntry({binding: 1}),
					{
						binding: 2,
						resource: {
							buffer: this.clusterComputeManager.lightIndicesBuffer,
						},
					},
				],
			});
		}
		return this.viewBindGroup;
	}
}
