import {ENABLE_WEBGPU_CLUSTERED_LIGHTS} from "../../../defines.js";
import ClusterComputeManager from "./ClusterComputeManager.js";

export default class CachedCameraData{
	constructor(camera, renderer){
		this.camera = camera;
		this.renderer = renderer;

		if(ENABLE_WEBGPU_CLUSTERED_LIGHTS){
			this.clusterComputeManager = new ClusterComputeManager(camera, this);
		}

		this.viewBindGroup = null;
	}

	getViewBindGroup(){
		if(!this.viewBindGroup){
			this.viewBindGroup = this.renderer.device.createBindGroup({
				layout: this.renderer.viewBindGroupLayout,
				entries: [
					{
						binding: 0,
						resource: {
							buffer: this.renderer.viewUniformsBuffer.gpuBuffer,
						},
					},
					this.renderer.lightsBuffer.createBindGroupEntry({binding: 1}),
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
