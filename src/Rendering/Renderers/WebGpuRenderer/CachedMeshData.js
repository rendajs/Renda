import CachedMeshBufferData from "./CachedMeshBufferData.js";

export default class CachedMeshData{
	constructor(mesh, renderer){
		this.mesh = mesh;
		this.renderer = renderer;

		//todo: remove old bufferdata when the list of buffers changes
		this.buffers = [];
		for(const meshBuffer of mesh.getBuffers(false)){
			const bufferData = new CachedMeshBufferData(meshBuffer, this);
			this.buffers.push(bufferData);
		}

		this.indexBuffer = null;
		this.createIndexGpuBuffer();

		//todo: remove listeners when gpurenderer is destroyed
		this.indexBufferDirty = false;
		this.mesh.onIndexBufferChanged(() => {
			this.indexBufferDirty = true;
		});
	}

	destructor(){
		//todo
	}

	createIndexGpuBuffer(){
		if(this.indexBuffer){
			this.indexBuffer.destroy();
			this.indexBuffer = null;
		}
		if(this.mesh.indexBuffer){
			const indexBuffer = this.renderer.device.createBuffer({
				size: this.mesh.indexBuffer.byteLength,
				usage: GPUBufferUsage.INDEX,
				mappedAtCreation: true,
			});
			new Uint8Array(indexBuffer.getMappedRange()).set(new Uint8Array(this.mesh.indexBuffer));
			indexBuffer.unmap();
			this.indexBuffer = indexBuffer;
		}
	}

	*getBufferGpuCommands(){
		for(const [i, buffer] of this.buffers.entries()){
			yield {
				index: i,
				...buffer.getBufferGpuCommands(),
			}
		}
	}

	getIndexedBufferGpuCommands(){
		//todo: support for dynamic indexbuffer updates using GPUBufferUsage.COPY_DST and device.queue.writeBuffer
		if(this.indexBufferDirty){
			this.createIndexGpuBuffer();
		}
		return this.indexBuffer;
	}
}
