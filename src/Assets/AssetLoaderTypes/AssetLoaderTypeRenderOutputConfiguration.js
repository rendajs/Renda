import AssetLoaderTypeGenericStructure from "./AssetLoaderTypeGenericStructure.js";
import BinaryComposer from "../../Util/BinaryComposer.js";
import RenderOutputConfiguration from "../../Rendering/RenderOutputConfiguration.js";

export default class AssetLoaderTypeRenderOutputConfiguration extends AssetLoaderTypeGenericStructure{

	static get typeUuid(){
		return "b4c9bbdc-86dc-4270-ae94-780dbaa66976";
	}

	static get binaryComposerOpts(){
		return {
			structure: {
				depthStencilFormat: ["stencil8", "depth16unorm", "depth24plus", "depth24plus-stencil8", "depth32float"],
				multisampleCount: BinaryComposer.StructureTypes.UINT8,
				fragmentTargets: [{
					format: ["bgra8unorm", "rgba16float"],
				}],
			},
			nameIds: {
				depthStencilFormat: 1,
				multisampleCount: 2,
				fragmentTargets: 3,
				format: 4,
			},
		}
	}

	constructor(){
		super(...arguments);
	}

	async parseBuffer(buffer){
		const data = await super.parseBuffer(buffer);
		return new RenderOutputConfiguration(data);
	}
}
