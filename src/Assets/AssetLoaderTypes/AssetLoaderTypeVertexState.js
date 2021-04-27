import AssetLoaderTypeGenericStructure from "./AssetLoaderTypeGenericStructure.js";
import BinaryComposer from "../../Util/BinaryComposer.js";
import WebGpuVertexState from "../../Rendering/Renderers/WebGpuRenderer/WebGpuVertexState.js";

export default class AssetLoaderTypeVertexState extends AssetLoaderTypeGenericStructure{

	static typeUuid = "07dcd52e-03a5-4823-b343-16a142c304f6";

	static binaryComposerOpts = {
		structure: {
			buffers: [{
				arrayStride: BinaryComposer.StructureTypes.INT16, //todo: support serializing auto value
				stepMode: BinaryComposer.StructureTypes.INT8,
				attributes: [{
					attributeType: BinaryComposer.StructureTypes.INT8,
					format: BinaryComposer.StructureTypes.INT8,
					componentCount: BinaryComposer.StructureTypes.INT8,
					unsigned: BinaryComposer.StructureTypes.BOOL,
					shaderLocation: BinaryComposer.StructureTypes.INT8, //todo: support serializing auto value
				}],
			}],
		},
		nameIds: {
			buffers: 1,
			arrayStride: 2,
			stepMode: 3,
			attributes: 4,
			attributeType: 5,
			format: 6,
			componentCount: 7,
			unsigned: 8,
			shaderLocation: 9,
		},
	}

	constructor(){
		super(...arguments);
	}

	async parseBuffer(buffer){
		const data = await super.parseBuffer(buffer);
		return new WebGpuVertexState(data);
	}
}
