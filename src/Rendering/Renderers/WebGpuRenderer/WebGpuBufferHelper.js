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

	appendScalar(val, type = "f32"){
		switch(type){
			case "f32":
			default:
				this.dataView.setFloat32(this.currentCursorByteIndex, val, true);
				break;
			case "i32":
				this.dataView.setInt32(this.currentCursorByteIndex, val, true);
				break;
			case "u32":
				this.dataView.setUint32(this.currentCursorByteIndex, val, true);
				break;
		}
		this.currentCursorByteIndex += 4;
	}

	appendData(data, type = "f32"){
		if(typeof data == "number"){
			this.appendScalar(data, type);
		}else{
			for(const val of data.toArray()){
				this.appendScalar(val, type);
			}
		}
	}

	skipBytes(byteLength){
		this.currentCursorByteIndex += byteLength;
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
