import {computeClusterBoundsShaderCode} from "./WebGpuShaders.js";

export default class WebGpuClusterSetup{
	constructor(camera, cachedCameraData){
		this.camera = camera;
		this.cachedCameraData = cachedCameraData;
		this.renderer = this.cachedCameraData.renderer;

		this.tileCountX = 16;
		this.tileCountY = 9;
		this.tileCountZ = 24;
		this.totalTileCount = this.tileCountX * this.tileCountY * this.tileCountZ;

		this.computeBoundsPipelineDirty = true;
		this.computeBoundsPipeline = null;
		this.boundsBuffer = null;
		this.boundsBindGroup = null;
	}

	computeBounds(commandEncoder){
		if(this.computeBoundsPipelineDirty){
			//todo: destroy old buffers etc
			this.computeBoundsPipeline = this.renderer.device.createComputePipeline({
				layout: this.renderer.device.createPipelineLayout({
					bindGroupLayouts: [
						this.renderer.viewBindGroupLayout,
						this.renderer.computeClusterBoundsBindGroupLayout,
					],
				}),
				computeStage: {
					module: this.renderer.device.createShaderModule({
						code: computeClusterBoundsShaderCode({
							totalTileCount: this.totalTileCount,
							tileCountX: this.tileCountX,
							tileCountY: this.tileCountY,
							tileCountZ: this.tileCountZ,
						}),
					}),
					entryPoint: "main",
				},
			});

			this.boundsBuffer = this.renderer.device.createBuffer({
				size: this.totalTileCount * 4 * 4 * 4, //4x4 32 bit float matrix
				usage: GPUBufferUsage.STORAGE,
			});

			this.boundsBindGroup = this.renderer.device.createBindGroup({
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

			this.computeBoundsPipelineDirty = false;
		}

		//todo, don't compute when the camera projection matrix or tile count hasn't changed
		const computePassEncoder = commandEncoder.beginComputePass();
		computePassEncoder.setPipeline(this.computeBoundsPipeline);
		computePassEncoder.setBindGroup(0, this.cachedCameraData.viewBindGroup);
		computePassEncoder.setBindGroup(1, this.boundsBindGroup);
		computePassEncoder.dispatch(this.tileCountX, this.tileCountY, this.tileCountZ);
		computePassEncoder.endPass();
	}
}
