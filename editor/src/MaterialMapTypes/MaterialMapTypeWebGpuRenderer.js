import {MaterialMapType} from "./MaterialMapType.js";
import {WebGpuPipelineConfig} from "../../../src/index.js";
import {StorageType} from "../../../src/Util/BinaryComposer.js";
import editor from "../editorInstance.js";

/**
 * @typedef {Object} MaterialMapTypeWebGpuRendererSavedCustomData
 * @property {import("../Util/Util.js").UuidString} forwardPipelineConfig
 */

export class MaterialMapTypeWebGpuRenderer extends MaterialMapType {
	static uiName = "WebGPU Renderer";
	static typeUuid = "286eaa41-36ce-4d94-9413-d52fc435b6e5";
	static allowExportInAssetBundles = true;

	/**
	 * @override
	 * @param {import("../UI/PropertiesTreeView/PropertiesTreeView.js").PropertiesTreeView} treeView
	 */
	constructor(treeView) {
		super(treeView);

		/** @type {import("../UI/PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewStructure} */
		this.settingsGuiStructure = {
			forwardPipelineConfig: {
				type: "droppable",
				guiOpts: {
					supportedAssetTypes: [WebGpuPipelineConfig],
				},
			},
		};

		this.settingsTreeView.generateFromSerializableStructure(this.settingsGuiStructure);
		this.settingsTreeView.onChildValueChange(() => {
			this.updateMapListUi();
			this.signalCustomDataChanged();
		});
	}

	/**
	 * @param {MaterialMapTypeWebGpuRendererSavedCustomData} customData
	 * @override
	 */
	async customAssetDataFromLoad(customData) {
		this.settingsTreeView.fillSerializableStructureValues({
			forwardPipelineConfig: customData.forwardPipelineConfig,
		});
	}

	/**
	 * @override
	 */
	async getCustomAssetDataForSave() {
		const settings = this.getSettingsValues();
		const data = {
			forwardPipelineConfig: settings.forwardPipelineConfig,
		};

		return data;
	}

	/**
	 * @param {MaterialMapTypeWebGpuRendererSavedCustomData} customData
	 * @override
	 */
	static async getMappableValues(customData) {
		/** @type {WebGpuPipelineConfig} */
		const pipelineConfig = await editor.projectManager.assetManager.getLiveAsset(customData.forwardPipelineConfig);
		/** @type {Map<string, import("./MaterialMapType.js").MaterialMapTypeMappableValue>} */
		const mappableValues = new Map();
		this.fillMappableValuesForShader(pipelineConfig.fragmentShader, mappableValues);
		return Array.from(mappableValues.values());
	}

	/**
	 * @param {import("../../../src/Rendering/ShaderSource.js").ShaderSource} shader
	 * @param {Map<string, import("./MaterialMapType.js").MaterialMapTypeMappableValue>} mappableValues
	 */
	static fillMappableValuesForShader(shader, mappableValues) {
		if (!shader) return;
		const blockRegex = /struct\s+MaterialUniforms\s*{(?<uniformsBlock>[\s\S]+?)}\s*;/;
		const match = shader.source.match(blockRegex);
		if (!match) return;
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
		membersRegex += "\\s*;";
		const vectorTypeRegex = /vec(?<vectorSize>[234])<(?<vectorType>\S+)>/;
		const matrixTypeRegex = /mat(?<rows>[234])x(?<columns>[234])<(?<matrixType>\S+)>/;
		for (const match of uniformsBlock.matchAll(new RegExp(membersRegex, "g"))) {
			const identifier = match.groups.identifier;
			let type = match.groups.type;
			if (!identifier || !type) continue;
			const vectorMatch = match[0].match(vectorTypeRegex);
			let isVector = false;
			let vectorSize = 0;
			let isMatrix = false;
			// let matrixRows = 0;
			// let matrixColumns = 0;
			if (vectorMatch) {
				isVector = true;
				vectorSize = Number(vectorMatch.groups.vectorSize);
				type = vectorMatch.groups.vectorType;
			} else {
				const matrixMatch = match[0].match(matrixTypeRegex);
				if (matrixMatch) {
					isMatrix = true;
					// matrixRows = Number(matrixMatch.groups.rows);
					// matrixColumns = Number(matrixMatch.groups.columns);
					type = matrixMatch.groups.matrixType;
				}
			}
			/** @type {import("../UI/PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewEntryType} */
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

	static async getLiveAssetCustomData(customData) {
		let forwardPipelineConfig = null;
		if (customData.forwardPipelineConfig) forwardPipelineConfig = await editor.projectManager.assetManager.getLiveAsset(customData.forwardPipelineConfig);
		return {forwardPipelineConfig};
	}

	static async *getLinkedAssetsInCustomData(customData) {
		await editor.projectManager.waitForAssetManagerLoad();
		if (customData.forwardPipelineConfig) yield editor.projectManager.assetManager.getProjectAsset(customData.forwardPipelineConfig);
	}

	static assetBundleBinaryComposerOpts = {
		structure: {
			forwardPipelineConfig: StorageType.ASSET_UUID,
		},
		nameIds: {
			forwardPipelineConfig: 1,
		},
	};

	getSettingsValues() {
		return this.settingsTreeView.getSerializableStructureValues(this.settingsGuiStructure);
	}
}
