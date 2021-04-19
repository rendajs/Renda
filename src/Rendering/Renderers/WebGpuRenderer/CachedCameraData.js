import ClusterSetup from "./ClusterSetup.js";

export default class CachedCameraData{
	constructor(camera, renderer){
		this.camera = camera;
		this.renderer = renderer;

		this.clusterSetup = new ClusterSetup(camera, this);

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
							buffer: this.clusterSetup.lightIndicesBuffer,
						},
					},
				],
			});
		}
		return this.viewBindGroup;
	}
}
