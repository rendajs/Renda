import WebGpuClusterSetup from "./WebGpuClusterSetup.js";

export default class WebGpuCachedCameraData{
	constructor(camera, renderer){
		this.camera = camera;
		this.renderer = renderer;

		this.clusterSetup = new WebGpuClusterSetup(camera, this);

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
			],
		});
	}
}
