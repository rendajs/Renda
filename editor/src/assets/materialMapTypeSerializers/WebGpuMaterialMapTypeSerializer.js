import {MaterialMapTypeSerializer} from "./MaterialMapTypeSerializer.js";
import {StorageType} from "../../../../src/util/binarySerialization.js";
import {WebGpuPipelineConfig} from "../../../../src/mod.js";
import {WebGpuMaterialMapType} from "../../../../src/rendering/renderers/webGpu/WebGpuMaterialMapType.js";
import {WebGpuPipelineConfigProjectAssetType} from "../projectAssetType/WebGpuPipelineConfigProjectAssetType.js";

const FORWARD_PIPELINE_CONFIG_PERSISTENCE_KEY = "webgpumaptype.forwardpipelineconfig";

/**
 * Regex string for matching wgsl identifiers according to the wgsl spec:
 * https://gpuweb.github.io/gpuweb/wgsl/#identifiers
 * @param {string} group
 */
const identifierRegex = "(?:(?:[a-zA-Z_][0-9a-zA-Z][0-9a-zA-Z_]*)|(?:[a-zA-Z][0-9a-zA-Z_]*))";

/**
 * @typedef {Object} WebGpuMaterialMapTypeDiskData
 * @property {import("../../../../src/util/mod.js").UuidString | import("../projectAssetType/WebGpuPipelineConfigProjectAssetType.js").WebGpuPipelineConfigAssetData | null} [forwardPipelineConfig]
 */

export class WebGpuMaterialMapTypeSerializer extends MaterialMapTypeSerializer {
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
				assertAssetType: WebGpuPipelineConfigProjectAssetType,
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

		// Find MaterialUniforms in the shader
		const blockRegex = /struct\s+MaterialUniforms\s*{(?<uniformsBlock>[\s\S]+?)}\s*;/;
		const match = shader.source.match(blockRegex);
		if (match && match.groups) {
			const uniformsBlock = match.groups.uniformsBlock;
			if (uniformsBlock) {
				let membersRegex = "";
				// Capture the identifier https://gpuweb.github.io/gpuweb/wgsl/#identifiers
				membersRegex += `(?<identifier>${identifierRegex})`;
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
					/** @type {import("../../ui/propertiesTreeView/types.js").GuiTypes} */
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
		}

		// Find texture and sampler bindings in the shader
		/** @type {{
		 * 	index: number,
		 * 	mappableValueType: import("./MaterialMapTypeSerializer.js").MaterialMapTypeMappableValue,
		  }[]} */
		const foundBindings = [];
		/** @type {{glslType: string, mappableValueType: import("../../../../src/rendering/MaterialMap.js").MappableMaterialTypesEnum}[]} */
		const variableTypes = [
			{glslType: "sampler", mappableValueType: "sampler"},
			{glslType: "texture_2d", mappableValueType: "texture2d"},
		];
		for (const varType of variableTypes) {
			let varRegex = "";
			// Capture one or more attributes, each individual attribute will
			// be parsed later to find out if the variable contains at least
			// a group and a binding.
			varRegex += `(?<attributes>(?:@${identifierRegex}+\\(\\d+\\)\\s*)*)`;
			// find the var keyword
			varRegex += "var";
			// allow an optional address space such as var<uniform>
			// We'll use a basic \S+ regex to to allow for multiple identifiers
			// such as var<uniform, read_write>. We won't use `identifierRegex`
			// here as it would cause catastrophic backtracking
			// https://www.regular-expressions.info/catastrophic.html
			// If we ever need to parse the address space values later, we will
			// do so using a separate regex.
			varRegex += `(?:<\\S+?>)?`;
			// allow optional whitespace
			varRegex += "\\s*";
			// capture the variable name
			varRegex += `(?<identifier>${identifierRegex})`;
			// [whitespace] : [whitespace]
			varRegex += "\\s*:\\s*";
			// find only variables of type sampler or texture_2d, depending on
			// which loop we are in
			varRegex += varType.glslType;

			const variableMatches = Array.from(shader.source.matchAll(new RegExp(varRegex, "g")));
			for (const variableMatch of variableMatches) {
				if (!variableMatch.groups) continue;
				const identifier = variableMatch.groups.identifier;
				if (!identifier) continue;
				const attributes = variableMatch.groups.attributes;
				if (!attributes) continue;
				let attributesRegex = "";
				// @
				attributesRegex += "@";
				// capture the identifier
				attributesRegex += `(?<name>${identifierRegex})`;
				// (
				attributesRegex += "\\(";
				// capture the value
				attributesRegex += `(?<value>\\d+)`;
				// )
				attributesRegex += "\\)";

				let hasValidGroupAttribute = false;
				let binding = null;
				for (const attributeMatch of attributes.matchAll(new RegExp(attributesRegex, "g"))) {
					if (!attributeMatch.groups) continue;
					const name = attributeMatch.groups.name;
					const value = attributeMatch.groups.value;
					if (!name || !value) continue;
					if (name == "group" && value == "1") {
						hasValidGroupAttribute = true;
					}
					if (name == "binding") {
						binding = parseInt(value, 10);
					}
				}
				if (!hasValidGroupAttribute || binding == null) continue;
				foundBindings.push({
					index: binding,
					mappableValueType: {
						name: identifier,
						type: varType.mappableValueType,
					},
				});
			}
		}

		foundBindings.sort((a, b) => a.index - b.index);
		for (const foundBinding of foundBindings) {
			mappableValues.set(foundBinding.mappableValueType.name, foundBinding.mappableValueType);
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
				assertAssetType: WebGpuPipelineConfigProjectAssetType,
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
	 * @param {import("../../Editor.js").Editor} editorInstance
	 * @param {import("../AssetManager.js").AssetManager} assetManager
	 * @param {*} customData
	 */
	static async *getLinkedAssetsInCustomData(editorInstance, assetManager, customData) {
		await editorInstance.projectManager.waitForAssetManagerLoad();
		const pipelineConfigAsset = await assetManager.getProjectAssetFromUuid(customData.forwardPipelineConfig, {
			assertAssetType: WebGpuPipelineConfigProjectAssetType,
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
