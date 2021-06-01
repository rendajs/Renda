import ShaderBuilder from "../../ShaderBuilder.js";

export default class ClusterComputeManager{
	constructor(camera, cachedCameraData){
		this.camera = camera;
		this.cachedCameraData = cachedCameraData;
		this.renderer = this.cachedCameraData.renderer;

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

	get config(){
		return this.camera.clusteredLightsConfig;
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
						code: ShaderBuilder.fillShaderDefines(this.renderer.computeClusterBoundsShaderCode.source, this.config.getShaderDefines()),
					}),
					entryPoint: "main",
				},
			});

			this.boundsBuffer = this.renderer.device.createBuffer({
				size: this.config.totalClusterCount * 32,
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
		computePassEncoder.dispatch(this.config.clusterCount.x, this.config.clusterCount.y, this.config.clusterCount.z);
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
						code: ShaderBuilder.fillShaderDefines(this.renderer.computeClusterLightsShaderCode.source, this.config.getShaderDefines()),
					}),
					entryPoint: "main",
				},
			});

			this.lightIndicesBuffer = this.renderer.device.createBuffer({
				size: (this.config.maxLightsPerClusterPass * 4 + 4) * this.config.totalClusterCount,
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
		computePassEncoder.dispatch(this.config.clusterCount.x, this.config.clusterCount.y, this.config.clusterCount.z);
		computePassEncoder.endPass();
	}
}
