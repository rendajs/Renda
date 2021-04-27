import AssetLoaderTypeGenericStructure from "./AssetLoaderTypeGenericStructure.js";
import BinaryComposer from "../../Util/BinaryComposer.js";
import WebGpuPipelineConfiguration from "../../Rendering/Renderers/WebGpuRenderer/WebGpuPipelineConfiguration.js";

export default class AssetLoaderTypeWebGpuPipelineConfiguration extends AssetLoaderTypeGenericStructure{

	static typeUuid = "c850b2eb-ab27-4991-b30e-b60d70ff6a2d";

	static binaryComposerOpts = {
		structure: {
			vertexShader: BinaryComposer.StructureTypes.UUID,
			fragmentShader: BinaryComposer.StructureTypes.UUID,
			preloadVertexStates: [BinaryComposer.StructureTypes.UUID],
		},
		nameIds: {
			vertexShader: 1,
			fragmentShader: 2,
			preloadVertexStates: 3,
		},
	}

	constructor(){
		super(...arguments);
	}

	async parseBuffer(buffer){
		const data = await super.parseBuffer(buffer);
		return new WebGpuPipelineConfiguration(data);
	}
}
