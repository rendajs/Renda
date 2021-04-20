export default class CachedMeshBufferData{
	constructor(meshBuffer, meshData){
		this.meshBuffer = meshBuffer;
		this.meshData = meshData;

		const size = meshBuffer.buffer.byteLength;
		this.currentGpuBufferSize = size;
		this.gpuBuffer = this.meshData.renderer.device.createBuffer({
			size,
			usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, //todo: only use copy_dst when buffer updates are actually expected
			mappedAtCreation: true,
		});
		new Uint8Array(this.gpuBuffer.getMappedRange()).set(new Uint8Array(meshBuffer.buffer));
		this.gpuBuffer.unmap();

		//todo: remove listeners when gpurenderer is destroyed
		this.bufferDirty = false;
		meshBuffer.onBufferChanged(_ => {
			this.bufferDirty = true;
		});
	}

	getGpuBufferCommands(){
		let newBufferData = null;
		if(this.bufferDirty){
			newBufferData = this.meshBuffer.buffer;
			this.bufferDirty = false;
		}
		return {
			gpuBuffer: this.gpuBuffer,
			newBufferData,
		}
	}
}
