import ProjectAssetType from "./ProjectAssetType.js";
import editor from "../../editorInstance.js";
import {RenderOutputConfig, AssetLoaderTypeRenderOutputConfig} from "../../../../src/index.js";

export default class ProjectAssetTypeRenderOutputConfig extends ProjectAssetType{

	static type = "JJ:renderOutputConfig";
	static typeUuid = "b4c9bbdc-86dc-4270-ae94-780dbaa66976";
	static newFileName = "New Render Output Config";

	constructor(){
		super(...arguments);
	}

	//todo: better support for webgl config
	static propertiesAssetContentStructure = {
		depthStencilFormat: {
			type: ["stencil8", "depth16unorm", "depth24plus", "depth24plus-stencil8", "depth32float"],
			defaultValue: "depth24plus",
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
						defaultValue: "bgra8unorm",
					},
				},
			},
		},
	};

	static expectedLiveAssetConstructor = RenderOutputConfig;

	async getLiveAssetData(fileData){
		const liveAsset = new RenderOutputConfig(fileData);
		return {liveAsset};
	}

	async fileChangedExternally(){
		this.liveAssetNeedsReplacement();
	}

	static usedAssetLoaderType = AssetLoaderTypeRenderOutputConfig;
}
