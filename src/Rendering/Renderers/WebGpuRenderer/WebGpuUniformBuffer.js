export default class WebGpuUniformBuffer{
	constructor({
		device = null,
		bindGroupLayout = null,
		bindGroupLength = 512,
		totalBufferLength = 512,
		propertiesMap = {},
	} = {}){
		this.device = device;
		this.bindGroupLayout = bindGroupLayout;
		this.bindGroupLength = bindGroupLength;
		this.totalBufferLength = totalBufferLength;

		this.currentDynamicOffset = 0;
		this.currentCursorByteIndex = 0;

		this.gpuBuffer = device.createBuffer({
			size: this.totalBufferLength,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});

		this.bindGroup = device.createBindGroup({
			layout: this.bindGroupLayout,
			entries: [
				{
					binding: 0,
					resource: {
						buffer: this.gpuBuffer,
						size: this.bindGroupLength,
					}
				}
			],
		});

		this.arrayBuffer = new ArrayBuffer(this.totalBufferLength);
		this.dataView = new DataView(this.arrayBuffer);
	}

	appendData(data){
		for(const val of data.getFlatArray()){
			//todo: support multiple types
			this.dataView.setFloat32(this.currentCursorByteIndex, val, true);
			this.currentCursorByteIndex += 4;
		}
	}

	nextDynamicOffset(){
		this.currentDynamicOffset += this.bindGroupLength;
		this.currentCursorByteIndex = this.currentDynamicOffset;
	}

	resetDynamicOffset(){
		this.currentDynamicOffset = this.currentCursorByteIndex = 0;
	}

	writeToGpu(){
		this.device.queue.writeBuffer(this.gpuBuffer, 0, this.arrayBuffer);
	}
}
