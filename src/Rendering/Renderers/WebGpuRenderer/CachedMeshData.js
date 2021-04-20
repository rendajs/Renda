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
		if(mesh.indexBuffer){
			const indexBuffer = this.renderer.device.createBuffer({
				size: mesh.indexBuffer.byteLength,
				usage: GPUBufferUsage.INDEX,
				mappedAtCreation: true,
			});
			new Uint8Array(indexBuffer.getMappedRange()).set(new Uint8Array(mesh.indexBuffer));
			indexBuffer.unmap();
			this.indexBuffer = indexBuffer;
		}
	}

	*getGpuBufferCommands(){
		for(const [i, buffer] of this.buffers.entries()){
			yield {
				index: i,
				...buffer.getGpuBufferCommands(),
			}
		}
	}
}
