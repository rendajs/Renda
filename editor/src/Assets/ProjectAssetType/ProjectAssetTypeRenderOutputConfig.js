import ProjectAssetType from "./ProjectAssetType.js";
import {AssetLoaderTypeRenderOutputConfig, RenderOutputConfig} from "../../../../src/index.js";

export default class ProjectAssetTypeRenderOutputConfig extends ProjectAssetType {
	static type = "JJ:renderOutputConfig";
	static typeUuid = "b4c9bbdc-86dc-4270-ae94-780dbaa66976";
	static newFileName = "New Render Output Config";

	// todo: better support for webgl config
	/** @type {import("../../UI/PropertiesTreeView/PropertiesTreeView.js").PropertiesTreeViewStructure} */
	static propertiesAssetContentStructure = {
		depthStencilFormat: {
			type: ["stencil8", "depth16unorm", "depth24plus", "depth24plus-stencil8", "depth32float"],
			defaultValue: "depth24plus",
		},
		multisampleCount: {
			/** @type {import("../../UI/NumericGui.js").NumericGuiOptions} */
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
	static usedAssetLoaderType = AssetLoaderTypeRenderOutputConfig;

	async getLiveAssetData(fileData) {
		const liveAsset = new RenderOutputConfig(fileData);
		return {liveAsset};
	}
}
