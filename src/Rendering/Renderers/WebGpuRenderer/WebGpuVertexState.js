import WebGpuVertexStateBuffer from "./WebGpuVertexStateBuffer.js";

export default class WebGpuVertexState{
	constructor({
		buffers = [],
	} = {}){
		this.buffers = [];

		for(const buffer of buffers){
			this.addBuffer(buffer);
		}

		this.requestingShaderLocationIndex = 0;
	}

	addBuffer(opts){
		const buffer = new WebGpuVertexStateBuffer(opts);
		this.buffers.push(buffer);
	}

	getDescriptor(){
		this.requestingShaderLocationIndex = 0;
		const vertexBuffers = this.buffers.map(b => b.getDescriptor(this));
		const descriptor = {vertexBuffers}; //todo: rename `vertexBuffers` to `buffers` when chrome renames the api
		return descriptor;
	}

	requestShaderLocationIndex(){
		return this.requestingShaderLocationIndex++;
	}

	*getBuffers(){
		for(const buffer of this.buffers){
			yield buffer;
		}
	}
}
