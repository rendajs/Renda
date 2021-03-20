export default class WebGpuPipeline{
	constructor(device, configuration, pipelineLayout, vertexState){
		this.pipeline = device.createRenderPipeline({
			layout: pipelineLayout,
			vertex: {
				module: device.createShaderModule({
					code: configuration.vertexShader.source,
				}),
				entryPoint: "main",
				...vertexState.getDescriptor(),
			},
			primitive: {
				topology: configuration.primitiveTopology,
			},
			depthStencil: {
				format: "depth24plus-stencil8",
				depthCompare: "less",
				depthWriteEnabled: true,
			},
			multisample: {
				count: 4,
			},
			fragment: {
				module: device.createShaderModule({
					code: configuration.fragmentShader.source,
				}),
				entryPoint: "main",
				targets: [
					{format: "bgra8unorm"},
				],
			},
		});
	}

	destructor(){}
}
