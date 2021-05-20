import VertexStateBuffer from "./VertexStateBuffer.js";

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
		const buffer = new VertexStateBuffer(opts);
		this.buffers.push(buffer);
	}

	getDescriptor(){
		this.requestingShaderLocationIndex = 0;
		const buffers = this.buffers.map(b => b.getDescriptor(this));
		const descriptor = {buffers};
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
