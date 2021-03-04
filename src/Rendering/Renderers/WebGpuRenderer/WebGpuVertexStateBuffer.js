import WebGpuVertexStateAttribute from "./WebGpuVertexStateAttribute.js";

export default class WebGpuVertexStateBuffer{
	constructor({
		stepMode = "vertex",
		arrayStride = null, //null or undefined or "auto" for auto stride
		attributes = [],
	} = {}){
		this.stepMode = stepMode;
		this.arrayStride = arrayStride;

		this.attributes = [];
		for(const attribute of attributes){
			this.addAttribute(attribute);
		}

		this.requestingAttributeOffset = 0;
	}

	addAttribute(opts){
		const attribute = new WebGpuVertexStateAttribute(opts);
		this.attributes.push(attribute);
	}

	getDescriptor(vertexState){
		const stepMode = this.stepMode;
		let arrayStride = this.arrayStride;
		this.requestingAttributeOffset = 0;
		const attributes = [];
		const autoArrayStride = arrayStride == null || arrayStride == "auto";
		if(autoArrayStride){
			arrayStride = 0;
		}
		for(const attribute of this.attributes){
			attributes.push(attribute.getDescriptor(vertexState, this));
			if(autoArrayStride){
				arrayStride = Math.max(arrayStride, attribute.minRequiredStrideBytes);
			}
		}
		return {stepMode, arrayStride, attributes};
	}

	requestAttributeOffset(neededOffset){
		const oldOffset = this.requestingAttributeOffset;
		this.requestingAttributeOffset += neededOffset;
		return oldOffset;
	}
}
