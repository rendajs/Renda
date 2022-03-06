import {ProjectAssetType} from "./ProjectAssetType.js";
import {AssetLoaderTypeWebGpuPipelineConfig, ShaderSource, VertexState, WebGpuPipelineConfig} from "../../../../src/mod.js";

/**
 * @typedef WebGpuPipelineConfigAssetData
 * @property {import("../../../../src/mod.js").UuidString} [vertexShader]
 * @property {import("../../../../src/mod.js").UuidString} [fragmentShader]
 * @property {GPUPrimitiveTopology} [primitiveTopology]
 * @property {GPUCompareFunction} [depthCompareFunction]
 * @property {boolean} [depthWriteEnabled]
 */

/**
 * @extends {ProjectAssetType<WebGpuPipelineConfig, null, WebGpuPipelineConfigAssetData>}
 */
export class ProjectAssetTypeWebGpuPipelineConfig extends ProjectAssetType {
	static type = "JJ:webGpuPipelineConfig";
	static typeUuid = "c850b2eb-ab27-4991-b30e-b60d70ff6a2d";
	static newFileName = "New Pipeline Config";

	/** @type {import("../../ui/propertiesTreeView/types.js").PropertiesTreeViewStructure} */
	static propertiesAssetContentStructure = {
		vertexShader: {
			type: "droppable",
			guiOpts: {
				supportedAssetTypes: [ShaderSource],
			},
		},
		fragmentShader: {
			type: "droppable",
			guiOpts: {
				supportedAssetTypes: [ShaderSource],
			},
		},
		primitiveTopology: {
			type: "dropdown",
			guiOpts: {
				items: AssetLoaderTypeWebGpuPipelineConfig.primitiveTopologyTypes,
				defaultValue: "triangle-list",
			},
		},
		depthCompareFunction: {
			type: "dropdown",
			guiOpts: {
				items: AssetLoaderTypeWebGpuPipelineConfig.compareFunction,
				defaultValue: "less",
			},
		},
		depthWriteEnabled: {
			type: "boolean",
			guiOpts: {
				defaultValue: true,
			},
		},
		preloadVertexStates: {
			type: "array",
			guiOpts: {
				arrayType: "droppable",
				arrayGuiOpts: {
					supportedAssetTypes: [VertexState],
				},
			},
		},
	};

	static expectedLiveAssetConstructor = WebGpuPipelineConfig;
	static usedAssetLoaderType = AssetLoaderTypeWebGpuPipelineConfig;

	/**
	 * @override
	 * @param {WebGpuPipelineConfigAssetData} fileData
	 * @param {import("../liveAssetDataRecursionTracker/RecursionTracker.js").RecursionTracker} recursionTracker
	 * @returns {Promise<import("./ProjectAssetType.js").LiveAssetData<WebGpuPipelineConfig, null>>}
	 */
	async getLiveAssetData(fileData, recursionTracker) {
		let fragmentShaderAsset = null;
		if (fileData.fragmentShader) {
			/** @type {import("../ProjectAsset.js").ProjectAsset<import("./ProjectAssetTypeShaderSource.js").ProjectAssetTypeShaderSource>?} */
			fragmentShaderAsset = await this.assetManager.getProjectAsset(fileData.fragmentShader);
		}
		let vertexShaderAsset = null;
		if (fileData.vertexShader) {
			/** @type {import("../ProjectAsset.js").ProjectAsset<import("./ProjectAssetTypeShaderSource.js").ProjectAssetTypeShaderSource>?} */
			vertexShaderAsset = await this.assetManager.getProjectAsset(fileData.vertexShader);
		}
		this.listenForUsedLiveAssetChanges(fragmentShaderAsset);
		this.listenForUsedLiveAssetChanges(vertexShaderAsset);
		// TODO: add capability for asset type assertions in getLiveAsset()
		// TODO: use recursionTracker, but find a way to combine it with listenForUsedLiveAssetChanges
		let vertexShader = null;
		let fragmentShader = null;
		if (vertexShaderAsset) {
			const shader = await vertexShaderAsset.getLiveAsset();
			if (shader instanceof ShaderSource) {
				vertexShader = shader;
			}
		}
		if (fragmentShaderAsset) {
			const shader = await fragmentShaderAsset.getLiveAsset();
			if (shader instanceof ShaderSource) {
				fragmentShader = shader;
			}
		}
		const liveAsset = new WebGpuPipelineConfig({
			vertexShader, fragmentShader,
			primitiveTopology: fileData.primitiveTopology,
			depthCompareFunction: fileData.depthCompareFunction,
			depthWriteEnabled: fileData.depthWriteEnabled,
		});
		return {liveAsset};
	}
}
