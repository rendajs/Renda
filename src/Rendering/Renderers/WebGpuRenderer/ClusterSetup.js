import {computeClusterBoundsShaderCode, computeClusterLightsShaderCode} from "./ClusteredComputeShaders.js";

export default class ClusterSetup{
	constructor(camera, cachedCameraData){
		this.camera = camera;
		this.cachedCameraData = cachedCameraData;
		this.renderer = this.cachedCameraData.renderer;

		this.tileCountX = 16;
		this.tileCountY = 9;
		this.tileCountZ = 24;
		this.totalTileCount = this.tileCountX * this.tileCountY * this.tileCountZ;

		this.maxLightsPerCluster = 10;

		this.computeBoundsPipelineDirty = true;
		this.computeBoundsPipeline = null;
		this.boundsBuffer = null;
		this.boundsBindGroup = null;

		this.computeLightIndicesPipelineDirty = true;
		this.computeLightIndicesPipeline = null;
		this.lightIndicesBuffer = null;
		this.lightIndicesBindGroup = null;
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
				compute: {
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
				size: this.totalTileCount * 32,
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

	computeLightIndices(commandEncoder){
		if(this.computeLightIndicesPipelineDirty){
			this.computeLightIndicesPipeline = this.renderer.device.createComputePipeline({
				layout: this.renderer.device.createPipelineLayout({
					bindGroupLayouts: [
						this.renderer.viewBindGroupLayout,
						this.renderer.computeClusterLightsBindGroupLayout,
					],
				}),
				compute: {
					module: this.renderer.device.createShaderModule({
						code: computeClusterLightsShaderCode({
							totalTileCount: this.totalTileCount,
							maxLightsPerCluster: this.maxLightsPerCluster,
							tileCountX: this.tileCountX,
							tileCountY: this.tileCountY,
							tileCountZ: this.tileCountZ,
						}),
					}),
					entryPoint: "main",
				},
			});

			this.lightIndicesBuffer = this.renderer.device.createBuffer({
				size: (this.maxLightsPerCluster * 4 + 4) * this.totalTileCount,
				usage: GPUBufferUsage.STORAGE,
			});

			this.lightIndicesBindGroup = this.renderer.device.createBindGroup({
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

			this.computeLightIndicesPipelineDirty = false;
		}

		const computePassEncoder = commandEncoder.beginComputePass();
		computePassEncoder.setPipeline(this.computeLightIndicesPipeline);
		computePassEncoder.setBindGroup(0, this.cachedCameraData.viewBindGroup);
		computePassEncoder.setBindGroup(1, this.lightIndicesBindGroup);
		computePassEncoder.dispatch(this.tileCountX, this.tileCountY, this.tileCountZ);
		computePassEncoder.endPass();
	}
}
