export default class WebGpuPipeline{
	constructor(device, configuration, pipelineLayout, vertexLayout){
		this.pipeline = device.createRenderPipeline({
			layout: pipelineLayout,
			vertexStage: {
				module: device.createShaderModule({
					code: configuration.vertexShader.source,
				}),
				entryPoint: "main",
			},
			fragmentStage: {
				module: device.createShaderModule({
					code: configuration.fragmentShader.source,
				}),
				entryPoint: "main",
			},
			primitiveTopology: "triangle-list",
			colorStates: [{
				format: "bgra8unorm",
			}],
			depthStencilState: {
				depthWriteEnabled: true,
				depthCompare: "less",
				format: "depth24plus-stencil8",
			},
			vertexState: vertexLayout.descriptor,
			sampleCount: 4,
		});
	}

	destructor(){}
}
