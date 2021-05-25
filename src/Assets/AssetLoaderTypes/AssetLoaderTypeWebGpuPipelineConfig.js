import AssetLoaderTypeGenericStructure from "./AssetLoaderTypeGenericStructure.js";
import BinaryComposer from "../../Util/BinaryComposer.js";
import WebGpuPipelineConfig from "../../Rendering/Renderers/WebGpuRenderer/WebGpuPipelineConfig.js";

export default class AssetLoaderTypeWebGpuPipelineConfig extends AssetLoaderTypeGenericStructure{

	static get typeUuid(){
		return "c850b2eb-ab27-4991-b30e-b60d70ff6a2d";
	}

	static get binaryComposerOpts(){
		return {
			structure: {
				vertexShader: BinaryComposer.StructureTypes.ASSET_UUID,
				fragmentShader: BinaryComposer.StructureTypes.ASSET_UUID,
				preloadVertexStates: [BinaryComposer.StructureTypes.ASSET_UUID],
			},
			nameIds: {
				vertexShader: 1,
				fragmentShader: 2,
				preloadVertexStates: 3,
			},
		}
	}

	constructor(){
		super(...arguments);
	}

	async parseBuffer(buffer){
		const data = await super.parseBuffer(buffer);
		return new WebGpuPipelineConfig(data);
	}
}
