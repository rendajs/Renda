import {MaterialMapTypeSerializer} from "./MaterialMapTypeSerializer.js";
import {StorageType} from "../../../../../../src/util/binarySerialization.js";
import {WebGpuPipelineConfig} from "../../../../../../src/mod.js";
import {WebGpuMaterialMapType} from "../../../../../../src/rendering/renderers/webGpu/WebGpuMaterialMapType.js";
import {ProjectAssetTypeWebGpuPipelineConfig} from "../../ProjectAssetTypeWebGpuPipelineConfig.js";

const FORWARD_PIPELINE_CONFIG_PERSISTENCE_KEY = "webgpumaptype.forwardpipelineconfig";

/**
 * @typedef {Object} WebGpuMaterialMapTypeDiskData
 * @property {import("../../../../../../src/util/mod.js").UuidString | import("../../ProjectAssetTypeWebGpuPipelineConfig.js").WebGpuPipelineConfigAssetData | null} [forwardPipelineConfig]
 */

export class WebGpuMaterialMapTypeSerializer extends MaterialMapTypeSerializer {
	static uiName = "WebGPU Renderer";
	static typeUuid = "286eaa41-36ce-4d94-9413-d52fc435b6e5";
	static allowExportInAssetBundles = true;
	static expectedLiveAssetConstructor = WebGpuMaterialMapType;

	/** @type {import("../../../../ui/propertiesTreeView/types.js").PropertiesTreeViewStructure} */
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
	 * @param {import("../../../../../../src/rendering/ShaderSource.js").ShaderSource} shader
	 * @param {Map<string, import("./MaterialMapTypeSerializer.js").MaterialMapTypeMappableValue>} mappableValues
	 */
	static fillMappableValuesForShader(shader, mappableValues) {
		if (!shader) return;
		const blockRegex = /struct\s+MaterialUniforms\s*{(?<uniformsBlock>[\s\S]+?)}\s*;/;
		const match = shader.source.match(blockRegex);
		if (!match || !match.groups) return;
		const uniformsBlock = match.groups.uniformsBlock;
		if (!uniformsBlock) return;
		let membersRegex = "";
		// Capture the identifier https://gpuweb.github.io/gpuweb/wgsl/#identifiers
		membersRegex += "(?<identifier>(?:[a-zA-Z_][0-9a-zA-Z][0-9a-zA-Z_]*)|(?:[a-zA-Z][0-9a-zA-Z_]*))";
		// [whitespace] : [whitespace]
		membersRegex += "\\s*:\\s*";
		// Capture the type
		membersRegex += "(?<type>.+?)";
		// [whitespace] ;
		membersRegex += "\\s*,";
		const vectorTypeRegex = /vec(?<vectorSize>[234])<(?<vectorType>\S+)>/;
		const matrixTypeRegex = /mat(?<rows>[234])x(?<columns>[234])<(?<matrixType>\S+)>/;
		for (const match of uniformsBlock.matchAll(new RegExp(membersRegex, "g"))) {
			if (!match.groups) continue;
			const identifier = match.groups.identifier;
			let type = match.groups.type;
			if (!identifier || !type) continue;
			const vectorMatch = match[0].match(vectorTypeRegex);
			let isVector = false;
			let vectorSize = 0;
			let isMatrix = false;
			// let matrixRows = 0;
			// let matrixColumns = 0;
			if (vectorMatch && vectorMatch.groups) {
				isVector = true;
				vectorSize = Number(vectorMatch.groups.vectorSize);
				type = vectorMatch.groups.vectorType;
			} else {
				const matrixMatch = match[0].match(matrixTypeRegex);
				if (matrixMatch && matrixMatch.groups) {
					isMatrix = true;
					// matrixRows = Number(matrixMatch.groups.rows);
					// matrixColumns = Number(matrixMatch.groups.columns);
					type = matrixMatch.groups.matrixType;
				}
			}
			/** @type {import("../../../../ui/propertiesTreeView/types.js").GuiTypes} */
			let mappableValueType = "number";
			if (isVector) {
				if (vectorSize == 2) {
					mappableValueType = "vec2";
				} else if (vectorSize == 3) {
					mappableValueType = "vec3";
				} else if (vectorSize == 4) {
					mappableValueType = "vec4";
				}
			} else if (isMatrix) {
				// todo implement matrix ui
				continue;
			}
			mappableValues.set(identifier, {
				name: identifier,
				type: mappableValueType,
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
			forwardPipelineConfig = await context.assetManager.getLiveAssetFromUuidOrEmbeddedAssetData(customData.forwardPipelineConfig, {
				assertAssetType: ProjectAssetTypeWebGpuPipelineConfig,
				parentAsset: context.materialMapAsset,
				embeddedAssetPersistenceKey: FORWARD_PIPELINE_CONFIG_PERSISTENCE_KEY,
			});
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
	 * @param {import("../../../../Editor.js").Editor} editorInstance
	 * @param {import("../../../AssetManager.js").AssetManager} assetManager
	 * @param {*} customData
	 */
	static async *getLinkedAssetsInCustomData(editorInstance, assetManager, customData) {
		await editorInstance.projectManager.waitForAssetManagerLoad();
		const pipelineConfigAsset = await assetManager.getProjectAssetFromUuid(customData.forwardPipelineConfig, {
			assertAssetType: ProjectAssetTypeWebGpuPipelineConfig,
		});
		if (pipelineConfigAsset) yield pipelineConfigAsset;
	}

	static assetBundleBinaryComposerOpts = {
		structure: {
			forwardPipelineConfig: StorageType.ASSET_UUID,
		},
		nameIds: {
			forwardPipelineConfig: 1,
		},
	};
}
