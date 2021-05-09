/**
@fileoverview externs file for webgpu api calls
@externs
*/

navigator.gpu = {}

/** @return {!GPUAdapter} */
navigator.gpu.requestAdapter = function(){}

class GPUAdapter{
	constructor(){
		this.name = "";
	}

	/** @return {!GPUDevice} */
	requestDevice(){}
}

class GPUDevice{
	constructor(){
		/** @type {!GPUQueue} */
		this.queue;
	}
	destroy(){}

	/**
		@param {GPUBufferDescriptor} descriptor
		@return {GPUBuffer}
	*/
	createBuffer(descriptor){}
	createTexture(){}
	createSampler(){}

	/**
		@param {GPUBindGroupLayoutDescriptor} descriptor
		@return {!GPUBindGroupLayout}
	*/
	createBindGroupLayout(descriptor){}
	/**
		@param {GPUPipelineLayoutDescriptor} descriptor
		@return {!GPUPipelineLayout}
	*/
	createPipelineLayout(descriptor){}
	/**
		@param {GPUBindGroupDescriptor} descriptor
		@return {!GPUBindGroup}
	*/
	createBindGroup(descriptor){}

	/**
		@param {GPUShaderModuleDescriptor} descriptor
		@return GPUShaderModule
	*/
	createShaderModule(descriptor){}
	createComputePipeline(){}
	/**
		@param {Object} descriptor
		@return GPURenderPipeline
	*/
	createRenderPipeline(descriptor){}
	createComputePipelineAsync(){}
	createRenderPipelineAsync(){}

	createCommandEncoder(){}
	createRenderBundleEncoder(){}

	createQuerySet(){}
}

class GPUBindGroupLayout{}
class GPUShaderModule{}
class GPUPipelineLayout{}
class GPUBindGroup{}

class GPUBuffer{
	/**
		@param {number} mode
		@param {number=} offset
		@param {number=} size
	*/
	mapAsync(mode, offset, size){}
	getMappedRange(){}
	unmap(){}
	destroy(){}
}

/**
	@typedef {{
		entries: Array<GPUBindGroupLayoutEntry>,
	}}
*/
var GPUBindGroupLayoutDescriptor;

/**
	@typedef {{
		size: number,
		usage: number,
		mappedAtCreation: (Boolean|null|undefined),
	}}
*/
var GPUBufferDescriptor;

/**
	@typedef {{
		binding: number,
		visibility: number,
	}}
*/
var GPUBindGroupLayoutEntry;

/**
	@typedef {{
		layout: GPUBindGroupLayout,
		entries: Array<GPUBindGroupEntry>,
	}}
*/
var GPUBindGroupDescriptor;

/**
	@typedef {{
		binding: number,
		resource: GPUBindingResource,
	}}
*/
var GPUBindGroupEntry;

/**
	@typedef {{
		buffer: GPUBuffer,
		offset: number,
		size: number,
	}}
*/
var GPUBindingResource;

/**
	@typedef {{
		code:string,
	}}
*/
var GPUShaderModuleDescriptor;

/**
	@typedef {{
		vertex: GPUVertexState,
		primitive: GPUPrimitiveState,
		depthStencil: GPUDepthStencilState,
		multisample: GPUMultisampleState,
		fragment: GPUFragmentState,
	}}
*/
var GPURenderPipelineDescriptor;

/**
	@typedef {{
		buffers: Array<GPUVertexBufferLayout>,
	}}
*/
var GPUVertexState;

/**
	@typedef {{
		arrayStride: number,
		stepMode: string,
		attributes: Array<GPUVertexAttribute>,
	}}
*/
var GPUVertexBufferLayout;

/**
	@typedef {{
		format: string,
		offset: number,
		shaderLocation: number,
	}}
*/
var GPUVertexAttribute;

/**
	@typedef {{
		topology: string,
		stripIndexFormat: string,
		frontFace: string,
		cullMode: string,
	}}
*/
var GPUPrimitiveState;

/**
	@typedef {{
		format: string,
		depthWriteEnabled: ?boolean,
		depthCompare: ?string,
		stencilFront: ?GPUStencilFaceState,
		stencilBack: ?GPUStencilFaceState,
		stencilReadMask: ?number,
		stencilWriteMask: ?number,
		depthBias: ?number,
		depthBiasSlopeScale: ?number,
		depthBiasClamp: ?number,
	}}
*/
var GPUDepthStencilState;

/**
	@typedef {{
		compare: string,
		failOp: string,
		depthFailOp: string,
		passOp: string,
	}}
*/
var GPUStencilFaceState;

/**
	@typedef {{
		count: number,
		mask: number,
		alphaToCoverageEnabled: boolean,
	}}
*/
var GPUMultisampleState;

/**
	@typedef {{
		targets: Array<GPUColorTargetState>,
	}}
*/
var GPUFragmentState;

/**
	@typedef {{
		format: string,
		blend: GPUBlendState,
		writeMask: number,
	}}
*/
var GPUColorTargetState;

/**
	@typedef {{
		color: GPUBlendComponent,
		alpha: GPUBlendComponent,
	}}
*/
var GPUBlendState;

/**
	@typedef {{
		srcFactor: string,
		dstFactor: string,
		operation: string,
	}}
*/
var GPUBlendComponent;

/**
	@typedef {{
		bindGroupLayouts: Array<GPUBindGroupLayout>,
	}}
*/
var GPUPipelineLayoutDescriptor;

class GPUQueue{
	/** @param {Array<GPUCommandBuffer>} commandBuffers */
	submit(commandBuffers){}

	/**
		@param {GPUBuffer} buffer,
		@param {number} bufferOffset,
		@param {BufferSource} data,
		@param {number=} dataOffset,
		@param {number=} size,
	*/
	writeBuffer(buffer, bufferOffset, data, dataOffset, size){}
}

class GPUCommandBuffer{}

const GPUMapMode = {};
GPUMapMode.READ = 0;
GPUMapMode.WRITE = 0;

const GPUTextureUsage = {};
GPUTextureUsage.COPY_SRC = 0;
GPUTextureUsage.COPY_DST = 0;
GPUTextureUsage.SAMPLED = 0;
GPUTextureUsage.STORAGE = 0;
GPUTextureUsage.RENDER_ATTACHMENT = 0;

const GPUBufferUsage = {};
GPUBufferUsage.MAP_READ = 0;
GPUBufferUsage.MAP_WRITE = 0;
GPUBufferUsage.COPY_SRC = 0;
GPUBufferUsage.COPY_DST = 0;
GPUBufferUsage.INDEX = 0;
GPUBufferUsage.VERTEX = 0;
GPUBufferUsage.UNIFORM = 0;
GPUBufferUsage.STORAGE = 0;
GPUBufferUsage.INDIRECT = 0;
GPUBufferUsage.QUERY_RESOLVE = 0;

const GPUShaderStage = {};
GPUShaderStage.VERTEX = 0;
GPUShaderStage.FRAGMENT = 0;
GPUShaderStage.COMPUTE = 0;

class GPUCanvasContext{
	/**
		@param {GPUSwapChainDescriptor} descriptor
		@return {GPUSwapChain}
	*/
	configureSwapChain(descriptor){}
	getSwapChainPreferredFormat(){}
}

/** @typedef {{
	device: GPUDevice,
	format: string,
	usage: number,
	compositingAlphaMode: string,
}}
*/
var GPUSwapChainDescriptor;

class GPUSwapChain{
	/**
		@return {GPUTexture}
	*/
	getCurrentTexture(){}
}

class GPUTexture{
	createView(){}

	destroy(){}
}
