import ShaderBuilder from "../../ShaderBuilder.js";

export default class ClusterSetup{
	constructor(camera, cachedCameraData){
		this.camera = camera;
		this.cachedCameraData = cachedCameraData;
		this.renderer = this.cachedCameraData.renderer;

		this.clusterCountX = 16;
		this.clusterCountY = 9;
		this.clusterCountZ = 24;
		this.totalClusterCount = this.clusterCountX * this.clusterCountY * this.clusterCountZ;

		this.maxLightsPerCluster = 10;

		this.computeBoundsPipelineDirty = true;
		this.computeBoundsPipeline = null;
		this.boundsBuffer = null;
		this.boundsBindGroup = null;
		this.createComputeBoundsObjects();

		this.computeLightIndicesPipelineDirty = true;
		this.computeLightIndicesPipeline = null;
		this.lightIndicesBuffer = null;
		this.lightIndicesBindGroup = null;
		this.createComputeLightIndicesObjects();
	}

	get shaderDefines(){
		return {
			totalClusterCount: this.totalClusterCount,
			maxLightsPerCluster: this.maxLightsPerCluster,
			clusterLightIndicesStride: this.maxLightsPerCluster * 4 + 4,
			clusterCountX: this.clusterCountX,
			clusterCountY: this.clusterCountY,
			clusterCountZ: this.clusterCountZ,
		}
	}

	createComputeBoundsObjects(){
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
						code: ShaderBuilder.fillShaderDefines(this.renderer.computeClusterBoundsShaderCode.source, this.shaderDefines),
					}),
					entryPoint: "main",
				},
			});

			this.boundsBuffer = this.renderer.device.createBuffer({
				size: this.totalClusterCount * 32,
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
	}

	computeBounds(commandEncoder){
		this.createComputeBoundsObjects();

		//todo, don't compute when the camera projection matrix or cluster count hasn't changed
		const computePassEncoder = commandEncoder.beginComputePass();
		computePassEncoder.setPipeline(this.computeBoundsPipeline);
		computePassEncoder.setBindGroup(0, this.cachedCameraData.getViewBindGroup());
		computePassEncoder.setBindGroup(1, this.boundsBindGroup);
		computePassEncoder.dispatch(this.clusterCountX, this.clusterCountY, this.clusterCountZ);
		computePassEncoder.endPass();
	}

	createComputeLightIndicesObjects(){
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
						code: ShaderBuilder.fillShaderDefines(this.renderer.computeClusterLightsShaderCode.source, this.shaderDefines),
					}),
					entryPoint: "main",
				},
			});

			this.lightIndicesBuffer = this.renderer.device.createBuffer({
				size: (this.maxLightsPerCluster * 4 + 4) * this.totalClusterCount,
				usage: GPUBufferUsage.STORAGE,
			});

			//todo: this bindgroup is unnecessary, the indices binding
			//from the viewBindGroupLayout can be used instead
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
	}

	computeLightIndices(commandEncoder){
		this.createComputeLightIndicesObjects();

		const computePassEncoder = commandEncoder.beginComputePass();
		computePassEncoder.setPipeline(this.computeLightIndicesPipeline);
		computePassEncoder.setBindGroup(0, this.cachedCameraData.viewBindGroup);
		computePassEncoder.setBindGroup(1, this.lightIndicesBindGroup);
		computePassEncoder.dispatch(this.clusterCountX, this.clusterCountY, this.clusterCountZ);
		computePassEncoder.endPass();
	}
}
