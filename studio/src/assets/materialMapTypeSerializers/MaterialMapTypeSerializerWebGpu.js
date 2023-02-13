import {MaterialMapTypeSerializer} from "./MaterialMapTypeSerializer.js";
import {StorageType} from "../../../../src/util/binarySerialization.js";
import {WebGpuPipelineConfig} from "../../../../src/mod.js";
import {WebGpuMaterialMapType} from "../../../../src/rendering/renderers/webGpu/WebGpuMaterialMapType.js";
import {ProjectAssetTypeWebGpuPipelineConfig} from "../projectAssetType/ProjectAssetTypeWebGpuPipelineConfig.js";
import {parseBindings, parseMaterialUniforms} from "../../../../src/util/wgslParsing.js";

const FORWARD_PIPELINE_CONFIG_PERSISTENCE_KEY = "webgpumaptype.forwardpipelineconfig";

/**
 * @typedef {object} WebGpuMaterialMapTypeDiskData
 * @property {import("../../../../src/util/mod.js").UuidString | import("../projectAssetType/ProjectAssetTypeWebGpuPipelineConfig.js").WebGpuPipelineConfigAssetData | null} [forwardPipelineConfig]
 */

export class MaterialMapTypeSerializerWebGpu extends MaterialMapTypeSerializer {
	static uiName = "WebGPU Renderer";
	static typeUuid = "286eaa41-36ce-4d94-9413-d52fc435b6e5";
	static allowExportInAssetBundles = true;
	static expectedLiveAssetConstructor = WebGpuMaterialMapType;

	/** @type {import("../../ui/propertiesTreeView/types.js").PropertiesTreeViewStructure} */
	static settingsStructure = {
		forwardPipelineConfig: {
			type: "droppable",
			guiOpts: {
				supportedAssetTypes: [WebGpuPipelineConfig],
				embeddedParentAssetPersistenceKey: FORWARD_PIPELINE_CONFIG_PERSISTENCE_KEY,
			},
		},
	};

	/**
	 * @override
	 * @param {import("./MaterialMapTypeSerializer.js").MaterialMapLiveAssetDataContext} context
	 * @param {WebGpuMaterialMapTypeDiskData?} customData
	 */
	static async getMappableValues(context, customData) {
		let pipelineConfig = null;
		if (customData?.forwardPipelineConfig) {
			pipelineConfig = await context.assetManager.getLiveAssetFromUuidOrEmbeddedAssetData(customData.forwardPipelineConfig, {
				assertAssetType: ProjectAssetTypeWebGpuPipelineConfig,
				parentAsset: context.materialMapAsset,
				embeddedAssetPersistenceKey: FORWARD_PIPELINE_CONFIG_PERSISTENCE_KEY,
			});
		}
		/** @type {Map<string, import("./MaterialMapTypeSerializer.js").MaterialMapTypeMappableValue>} */
		const mappableValues = new Map();
		if (pipelineConfig?.fragmentShader) {
			this.fillMappableValuesForShader(pipelineConfig.fragmentShader, mappableValues);
		}
		return Array.from(mappableValues.values());
	}

	/**
	 * @param {import("../../../../src/rendering/ShaderSource.js").ShaderSource} shader
	 * @param {Map<string, import("./MaterialMapTypeSerializer.js").MaterialMapTypeMappableValue>} mappableValues
	 */
	static fillMappableValuesForShader(shader, mappableValues) {
		if (!shader) return;

		const materialUniforms = parseMaterialUniforms(shader.source);
		for (const {identifier, type} of materialUniforms) {
			mappableValues.set(identifier, {
				name: identifier,
				type,
			});
		}

		for (const {identifier, type, group} of parseBindings(shader.source)) {
			if (group != 1) continue;
			mappableValues.set(identifier, {
				name: identifier,
				type,
			});
		}
	}

	/**
	 * @override
	 * @param {import("./MaterialMapTypeSerializer.js").MaterialMapLiveAssetDataContext} context
	 * @param {WebGpuMaterialMapTypeDiskData?} customData
	 */
	static async loadLiveAssetData(context, customData) {
		/** @type {WebGpuPipelineConfig?} */
		let forwardPipelineConfig = null;
		if (customData?.forwardPipelineConfig) {
			const forwardPipelineConfigAsset = await context.assetManager.getProjectAssetFromUuidOrEmbeddedAssetData(customData.forwardPipelineConfig, {
				assertAssetType: ProjectAssetTypeWebGpuPipelineConfig,
				parentAsset: context.materialMapAsset,
				embeddedAssetPersistenceKey: FORWARD_PIPELINE_CONFIG_PERSISTENCE_KEY,
			});
			const materialMapAssetType = await context.materialMapAsset.getProjectAssetType();
			materialMapAssetType.listenForUsedLiveAssetChanges(forwardPipelineConfigAsset);
			if (forwardPipelineConfigAsset) {
				forwardPipelineConfig = await forwardPipelineConfigAsset.getLiveAsset();
			}
		}
		return new WebGpuMaterialMapType({forwardPipelineConfig});
	}

	/**
	 * @override
	 * @param {import("./MaterialMapTypeSerializer.js").MaterialMapLiveAssetDataContext} context
	 * @param {WebGpuMaterialMapType} liveAssetMaterialMapType
	 */
	static async saveLiveAssetData(context, liveAssetMaterialMapType) {
		/** @type {WebGpuMaterialMapTypeDiskData} */
		const data = {};
		if (liveAssetMaterialMapType.forwardPipelineConfig) {
			data.forwardPipelineConfig = context.assetManager.getAssetUuidOrEmbeddedAssetDataFromLiveAsset(liveAssetMaterialMapType.forwardPipelineConfig);
		}
		return data;
	}

	/**
	 * @override
	 * @param {import("../../Studio.js").Studio} studioInstance
	 * @param {import("../AssetManager.js").AssetManager} assetManager
	 * @param {*} customData
	 */
	static async *getLinkedAssetsInCustomData(studioInstance, assetManager, customData) {
		await studioInstance.projectManager.waitForAssetListsLoad();
		const pipelineConfigAsset = await assetManager.getProjectAssetFromUuid(customData.forwardPipelineConfig, {
			assertAssetType: ProjectAssetTypeWebGpuPipelineConfig,
		});
		if (pipelineConfigAsset) yield pipelineConfigAsset;
	}

	static assetBundleBinarySerializationOpts = {
		structure: {
			forwardPipelineConfig: StorageType.ASSET_UUID,
		},
		nameIds: {
			forwardPipelineConfig: 1,
		},
	};
}
