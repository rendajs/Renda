import WebGpuVertexStateAttribute from "./WebGpuVertexStateAttribute.js";

export default class WebGpuVertexStateBuffer{
	constructor({
		stepMode = "vertex",
		arrayStride = null, //null or undefined or "auto" for auto stride
		attributes = [],
	} = {}){
		this.stepMode = stepMode;
		this._customArrayStride = arrayStride;
		this.autoArrayStride = arrayStride == null || arrayStride == "auto";
		this._calculatedArrayStride = 0;
		this.requestingAttributeOffset = 0;

		this.attributes = [];
		for(const attribute of attributes){
			this.addAttribute(attribute);
		}
	}

	addAttribute(opts){
		const attribute = new WebGpuVertexStateAttribute(opts);
		this.attributes.push(attribute);

		this.calculateAttributeOffsets();
	}

	get arrayStride(){
		if(this.autoArrayStride){
			return this._calculatedArrayStride;
		}else{
			return this._customArrayStride;
		}
	}

	getDescriptor(vertexState){
		const stepMode = this.stepMode;
		this.requestingAttributeOffset = 0;
		const attributes = [];
		for(const attribute of this.attributes){
			attributes.push(attribute.getDescriptor(vertexState, this));
		}
		return {
			stepMode,
			arrayStride: this.arrayStride,
			attributes,
		};
	}

	requestAttributeOffset(neededOffset){
		const oldOffset = this.requestingAttributeOffset;
		this.requestingAttributeOffset += neededOffset;
		return oldOffset;
	}

	calculateAttributeOffsets(){
		let i=0;
		for(const attribute of this.attributes){
			attribute.setOffset(i);
			i += attribute.byteSize;
		}
		this._calculatedArrayStride = i;
	}
}
