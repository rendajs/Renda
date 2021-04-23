import AssetLoaderTypeGenericBinaryStructure from "./AssetLoaderTypeGenericBinaryStructure.js";
import BinaryComposer from "../../Util/BinaryComposer.js";
import WebGpuVertexState from "../../Rendering/Renderers/WebGpuRenderer/WebGpuVertexState.js";

export default class AssetLoaderTypeVertexState extends AssetLoaderTypeGenericBinaryStructure{

	static typeUuid = "07dcd52e-03a5-4823-b343-16a142c304f6";

	static structure = {
		buffers: [{
			arrayStride: BinaryComposer.StructureTypes.INT16,
			stepMode: BinaryComposer.StructureTypes.INT8,
			attributes: [{
				attributeType: BinaryComposer.StructureTypes.INT8,
				format: BinaryComposer.StructureTypes.INT8,
				componentCount: BinaryComposer.StructureTypes.INT8,
				unsigned: BinaryComposer.StructureTypes.BOOL,
				shaderLocation: BinaryComposer.StructureTypes.INT8,
			}],
		}],
	};
	static nameIds = {
		buffers: 1,
		arrayStride: 2,
		stepMode: 3,
		attributes: 4,
		attributeType: 5,
		format: 6,
		componentCount: 7,
		unsigned: 8,
		shaderLocation: 9,
	};

	constructor(){
		super();
	}

	parseBuffer(buffer){
		const data = super.parseBuffer(buffer);
		return new WebGpuVertexState(data);
	}
}
