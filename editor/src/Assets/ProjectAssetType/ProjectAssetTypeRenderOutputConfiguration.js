import ProjectAssetType from "./ProjectAssetType.js";
import editor from "../../editorInstance.js";
import {RenderOutputConfiguration, AssetLoaderTypeRenderOutputConfiguration} from "../../../../src/index.js";

export default class ProjectAssetTypeRenderOutputConfiguration extends ProjectAssetType{

	static type = "JJ:renderOutputConfiguration";
	static typeUuid = "b4c9bbdc-86dc-4270-ae94-780dbaa66976";
	static newFileName = "New Render Output Configuration";

	constructor(){
		super(...arguments);
	}

	static createNewFile(){
		return {};
	}

	//todo: better support for webgl configuration
	static propertiesAssetContentStructure = {
		depthStencilFormat: {
			type: ["stencil8", "depth16unorm", "depth24plus", "depth24plus-stencil8", "depth32float"],
			guiOpts: {value: "depth24plus"},
		},
		multisampleCount: {
			guiOpts: {min: 1, step: 1},
		},
		fragmentTargets: {
			type: Array,
			arrayOpts: {
				type: {
					format: {
						type: ["bgra8unorm", "rgba16float"],
						guiOpts: {value: "bgra8unorm"},
					},
				},
			},
		},
	};

	static expectedLiveAssetConstructor = RenderOutputConfiguration;

	async getLiveAssetData(fileData){
		const liveAsset = new RenderOutputConfiguration(fileData);
		return {liveAsset};
	}

	async fileChangedExternally(){
		this.liveAssetNeedsReplacement();
	}

	static usedAssetLoaderType = AssetLoaderTypeRenderOutputConfiguration;
}
