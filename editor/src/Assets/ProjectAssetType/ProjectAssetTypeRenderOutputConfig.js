import ProjectAssetType from "./ProjectAssetType.js";
import {AssetLoaderTypeRenderOutputConfig, RenderOutputConfig} from "../../../../src/index.js";

export default class ProjectAssetTypeRenderOutputConfig extends ProjectAssetType {
	static type = "JJ:renderOutputConfig";
	static typeUuid = "b4c9bbdc-86dc-4270-ae94-780dbaa66976";
	static newFileName = "New Render Output Config";

	// todo: better support for webgl config
	/** @type {import("../../UI/PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewStructure} */
	static propertiesAssetContentStructure = {
		depthStencilFormat: {
			type: "dropdown",
			defaultValue: "depth24plus",
			guiOpts: {
				items: ["stencil8", "depth16unorm", "depth24plus", "depth24plus-stencil8", "depth32float"],
			},
		},
		multisampleCount: {
			/** @type {import("../../UI/NumericGui.js").NumericGuiOptions} */
			guiOpts: {min: 1, step: 1},
		},
		fragmentTargets: {
			type: "array",
			guiOpts: {
				arrayType: "object",
				/** @type {import("../../Ui/ObjectGui.js").ObjectGuiOptions} */
				arrayGuiOpts: {
					structure: {
						format: {
							type: "dropdown",
							defaultValue: "bgra8unorm",
							guiOpts: {
								items: ["bgra8unorm", "rgba16float"],
							},
						},
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
