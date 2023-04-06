import {ProjectAssetType} from "./ProjectAssetType.js";
import {AssetLoaderTypeWebGpuPipelineConfig, ShaderSource, VertexState, WebGpuPipelineConfig} from "../../../../src/mod.js";
import {ProjectAssetTypeShaderSource} from "./ProjectAssetTypeShaderSource.js";
import {blendFactor, blendOperation, compareFunction, primitiveTopologyTypes} from "../../../../src/assets/assetLoaderTypes/AssetLoaderTypeWebGpuPipelineConfig.js";
import {createTreeViewEntryOptions} from "../../ui/propertiesTreeView/createStructureHelpers.js";

/**
 * @typedef WebGpuPipelineConfigAssetData
 * @property {import("../../../../src/mod.js").UuidString} [vertexShader]
 * @property {import("../../../../src/mod.js").UuidString} [fragmentShader]
 * @property {GPUPrimitiveTopology} [primitiveTopology]
 * @property {GPUCompareFunction} [depthCompareFunction]
 * @property {boolean} [depthWriteEnabled]
 * @property {import("../../../../src/util/types.js").RecursivePartial<GPUBlendState>} [blend]
 * @property {number} [renderOrder]
 */

const gpuBlendComponentStructure = createTreeViewEntryOptions({
	type: "object",
	guiOpts: {
		structure: {
			operation: {
				type: "dropdown",
				guiOpts: {
					items: blendOperation,
					defaultValue: "add",
				},
			},
			srcFactor: {
				type: "dropdown",
				guiOpts: {
					items: blendFactor,
					defaultValue: "one",
				},
			},
			dstFactor: {
				type: "dropdown",
				guiOpts: {
					items: blendFactor,
					defaultValue: "zero",
				},
			},
		},
	},
});

/**
 * @extends {ProjectAssetType<WebGpuPipelineConfig, null, WebGpuPipelineConfigAssetData>}
 */
export class ProjectAssetTypeWebGpuPipelineConfig extends ProjectAssetType {
	static type = "renda:webGpuPipelineConfig";
	static typeUuid = "c850b2eb-ab27-4991-b30e-b60d70ff6a2d";
	static newFileName = "New Pipeline Config";
	static uiName = "Pipeline Config";

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
				items: primitiveTopologyTypes,
				defaultValue: "triangle-list",
			},
		},
		depthCompareFunction: {
			type: "dropdown",
			guiOpts: {
				items: compareFunction,
				defaultValue: "less",
			},
		},
		depthWriteEnabled: {
			type: "boolean",
			guiOpts: {
				defaultValue: true,
			},
		},
		blend: {
			type: "object",
			guiOpts: {
				structure: {
					color: gpuBlendComponentStructure,
					alpha: gpuBlendComponentStructure,
				},
			},
		},
		renderOrder: {
			type: "number",
			guiOpts: {
				defaultValue: 0,
				step: 1,
			},
		},
	};

	static expectedLiveAssetConstructor = WebGpuPipelineConfig;
	static usedAssetLoaderType = AssetLoaderTypeWebGpuPipelineConfig;

	/** @type {import("../../tasks/task/TaskGenerateServices.js").AssetLoaderTypeImportConfig} */
	static assetLoaderTypeImportConfig = {
		identifier: "AssetLoaderTypeWebGpuPipelineConfig",
	};

	/**
	 * @override
	 * @param {WebGpuPipelineConfigAssetData} fileData
	 * @param {import("../liveAssetDataRecursionTracker/RecursionTracker.js").RecursionTracker} recursionTracker
	 * @returns {Promise<import("./ProjectAssetType.js").LiveAssetData<WebGpuPipelineConfig, null>>}
	 */
	async getLiveAssetData(fileData, recursionTracker) {
		const fragmentShaderAsset = await this.assetManager.getProjectAssetFromUuid(fileData.fragmentShader, {
			assertAssetType: ProjectAssetTypeShaderSource,
		});
		const vertexShaderAsset = await this.assetManager.getProjectAssetFromUuid(fileData.vertexShader, {
			assertAssetType: ProjectAssetTypeShaderSource,
		});
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
		/** @type {GPUBlendState | undefined} */
		let blend;
		if (fileData.blend) {
			blend = {
				color: {},
				alpha: {},
			};
			// TODO: if any of these have not been set, they will be undefined.
			// WebGPU doesn't support undefined and properties need to be explicitly omitted,
			// otherwise it will cause an error.
			if (fileData.blend.color) {
				blend.color.operation = fileData.blend.color.operation;
				blend.color.srcFactor = fileData.blend.color.srcFactor;
				blend.color.dstFactor = fileData.blend.color.dstFactor;
			}
			if (fileData.blend.alpha) {
				blend.alpha.operation = fileData.blend.alpha.operation;
				blend.alpha.srcFactor = fileData.blend.alpha.srcFactor;
				blend.alpha.dstFactor = fileData.blend.alpha.dstFactor;
			}
		}
		const liveAsset = new WebGpuPipelineConfig({
			vertexShader, fragmentShader,
			primitiveTopology: fileData.primitiveTopology,
			depthCompareFunction: fileData.depthCompareFunction,
			depthWriteEnabled: fileData.depthWriteEnabled,
			renderOrder: fileData.renderOrder,
			blend,
		});
		return {liveAsset, studioData: null};
	}
}
