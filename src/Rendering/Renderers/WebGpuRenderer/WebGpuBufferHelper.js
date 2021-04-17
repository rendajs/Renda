export default class WebGpuBufferHelper{
	constructor({
		device = null,
		bindGroupLayout = null,
		bindGroupLength = 512,
		totalBufferLength = bindGroupLength,
		usage = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
	} = {}){
		this.device = device;
		this.bindGroupLayout = bindGroupLayout;
		this.bindGroupLength = bindGroupLength;
		this.totalBufferLength = totalBufferLength;

		this.currentBufferOffset = 0;
		this.currentCursorByteIndex = 0;

		this.gpuBuffer = device.createBuffer({
			size: this.totalBufferLength,
			usage,
		});

		this.arrayBuffer = new ArrayBuffer(this.totalBufferLength);
		this.dataView = new DataView(this.arrayBuffer);
	}

	createBindGroup(){
		return this.device.createBindGroup({
			layout: this.bindGroupLayout,
			entries: [this.createBindGroupEntry()],
		});
	}

	createBindGroupEntry({binding = 0} = {}){
		return {
			binding,
			resource: {
				buffer: this.gpuBuffer,
				size: this.bindGroupLength,
			}
		}
	}

	appendScalar(val){
		//todo: support multiple types
		this.dataView.setFloat32(this.currentCursorByteIndex, val, true);
		this.currentCursorByteIndex += 4;
	}

	appendData(data){
		for(const val of data.toArray()){
			//todo: support multiple types
			this.dataView.setFloat32(this.currentCursorByteIndex, val, true);
			this.currentCursorByteIndex += 4;
		}
	}

	nextBufferOffset(offset = this.bindGroupLength){
		this.currentBufferOffset += offset;
		this.currentCursorByteIndex = this.currentBufferOffset;
	}

	resetBufferOffset(){
		this.currentBufferOffset = this.currentCursorByteIndex = 0;
	}

	writeToGpu(){
		this.device.queue.writeBuffer(this.gpuBuffer, 0, this.arrayBuffer);
	}
}
