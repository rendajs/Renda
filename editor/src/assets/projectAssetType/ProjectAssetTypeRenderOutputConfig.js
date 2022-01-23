import {ProjectAssetType} from "./ProjectAssetType.js";
import {AssetLoaderTypeRenderOutputConfig, RenderOutputConfig} from "../../../../src/mod.js";

// todo: better types for generics
/**
 * @extends {ProjectAssetType<RenderOutputConfig, null, any>}
 */
export class ProjectAssetTypeRenderOutputConfig extends ProjectAssetType {
	static type = "JJ:renderOutputConfig";
	static typeUuid = "b4c9bbdc-86dc-4270-ae94-780dbaa66976";
	static newFileName = "New Render Output Config";

	// todo: better support for webgl config
	/** @type {import("../../ui/propertiesTreeView/types.js").PropertiesTreeViewStructure} */
	static propertiesAssetContentStructure = {
		depthStencilFormat: {
			type: "dropdown",
			guiOpts: {
				items: ["stencil8", "depth16unorm", "depth24plus", "depth24plus-stencil8", "depth32float"],
				defaultValue: "depth24plus",
			},
		},
		multisampleCount: {
			type: "number",
			guiOpts: {min: 1, step: 1},
		},
		fragmentTargets: {
			type: "array",
			guiOpts: {
				arrayType: "object",
				arrayGuiOpts: {
					structure: {
						format: {
							type: "dropdown",
							guiOpts: {
								items: ["bgra8unorm", "rgba16float"],
								defaultValue: "bgra8unorm",
							},
						},
					},
				},
			},
		},
	};

	static expectedLiveAssetConstructor = RenderOutputConfig;
	static usedAssetLoaderType = AssetLoaderTypeRenderOutputConfig;

	/**
	 * @override
	 * @param {*} fileData
	 * @returns {Promise<import("./ProjectAssetType.js").LiveAssetData<RenderOutputConfig, null>>}
	 */
	async getLiveAssetData(fileData) {
		const liveAsset = new RenderOutputConfig(fileData);
		return {liveAsset};
	}
}
