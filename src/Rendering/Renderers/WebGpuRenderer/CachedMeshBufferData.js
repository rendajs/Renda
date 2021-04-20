export default class CachedMeshBufferData{
	constructor(meshBuffer, meshData){
		this.meshBuffer = meshBuffer;
		this.meshData = meshData;

		this.createGpuBuffer();

		//todo: remove listeners when gpurenderer is destroyed
		this.bufferDirty = false;
		meshBuffer.onBufferChanged(_ => {
			this.bufferDirty = true;
		});
	}

	destructor(){
		//todo
	}

	createGpuBuffer(){
		if(this.gpuBuffer){
			this.gpuBuffer.destroy();
		}
		const size = this.meshBuffer.buffer.byteLength;
		this.gpuBuffer = this.meshData.renderer.device.createBuffer({
			size,
			usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, //todo: only use copy_dst when buffer updates are actually expected
			mappedAtCreation: true,
		});
		new Uint8Array(this.gpuBuffer.getMappedRange()).set(new Uint8Array(this.meshBuffer.buffer));
		this.gpuBuffer.unmap();
		this.currentGpuBufferSize = size;
	}

	getBufferGpuCommands(){
		let newBufferData = null;
		if(this.bufferDirty){
			if(this.currentGpuBufferSize != this.meshBuffer.buffer.byteLength){
				this.createGpuBuffer();
			}
			newBufferData = this.meshBuffer.buffer;
			this.bufferDirty = false;
		}
		return {
			gpuBuffer: this.gpuBuffer,
			newBufferData,
		}
	}
}
