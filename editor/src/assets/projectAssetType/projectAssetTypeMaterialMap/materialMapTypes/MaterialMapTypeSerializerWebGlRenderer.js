import {MaterialMapTypeSerializer} from "./MaterialMapTypeSerializer.js";
import {ShaderSource, Vec3} from "../../../../../../src/mod.js";
import {StorageType} from "../../../../../../src/util/BinaryComposer.js";

export class MaterialMapTypeSerializerWebGlRenderer extends MaterialMapTypeSerializer {
	static uiName = "WebGL Renderer";
	static typeUuid = "392a2a4e-c895-4245-9c6d-d6259b8e5267";
	static allowExportInAssetBundles = true;

	constructor() {
		super();

		/** @type {import("../../../../UI/PropertiesTreeView/types.js").PropertiesTreeViewStructure} */
		this.settingsGuiStructure = {
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
		};
	}

	/**
	 * @override
	 * @param {import("../../../../Editor.js").Editor} editorInstance
	 * @param {import("../../../AssetManager.js").AssetManager} assetManager
	 * @param {*} customData
	 */
	static async *getLinkedAssetsInCustomData(editorInstance, assetManager, customData) {
		if (customData.vertexShader) yield assetManager.getProjectAsset(customData.vertexShader);
		if (customData.fragmentShader) yield assetManager.getProjectAsset(customData.fragmentShader);
	}

	static assetBundleBinaryComposerOpts = {
		structure: {
			vertUuid: StorageType.UUID,
			fragUuid: StorageType.UUID,
		},
		nameIds: {
			vertUuid: 1,
			fragUuid: 2,
		},
	};

	/**
	 * @param {*} mapData
	 */
	static mapDataToAssetBundleData(mapData) {
		return {
			vertUuid: mapData.vertexShader,
			fragUuid: mapData.fragmentShader,
		};
	}

	/**
	 * @override
	 * @param {import("../../../../Editor.js").Editor} editorInstance
	 * @param {import("../../../AssetManager.js").AssetManager} assetManager
	 * @param {*} customData
	 */
	static async getMappableValues(editorInstance, assetManager, customData) {
		const itemsMap = new Map();
		await this.addShaderUniformsToMap(assetManager, customData.vertexShader, itemsMap);
		await this.addShaderUniformsToMap(assetManager, customData.fragmentShader, itemsMap);

		const items = [];
		for (const [name, itemData] of itemsMap) {
			const type = itemData.type;
			items.push({name, type});
		}
		return items;
	}

	/**
	 * @param {import("../../../AssetManager.js").AssetManager} assetManager
	 * @param {import("../../../../../../src/mod.js").UuidString} shaderUuid
	 * @param {Map<string, *>} itemsMap
	 */
	static async addShaderUniformsToMap(assetManager, shaderUuid, itemsMap) {
		/** @type {import("../../../ProjectAsset.js").ProjectAsset<import("../../ProjectAssetTypeShaderSource.js").ProjectAssetTypeShaderSource>?} */
		const shaderAsset = await assetManager.getProjectAsset(shaderUuid);
		for (const {name, type} of await this.getMapItemsIteratorFromShaderAsset(shaderAsset)) {
			itemsMap.set(name, {type});
		}
	}

	/**
	 * @param {import("../../../ProjectAsset.js").ProjectAsset<import("../../ProjectAssetTypeShaderSource.js").ProjectAssetTypeShaderSource>?} asset
	 */
	static async getMapItemsIteratorFromShaderAsset(asset) {
		if (!asset) return [];
		const shader = await asset.getLiveAsset();
		if (!shader) return [];
		return this.getMapItemsFromShaderSource(shader.source);
	}

	/**
	 * @param {string} shaderSrc
	 */
	static *getMapItemsFromShaderSource(shaderSrc) {
		const re = /^\s*uniform\s(?<type>.+?)\s+(?<name>.+?)\s*;/gm;
		for (const result of shaderSrc.matchAll(re)) {
			if (!result.groups) continue;
			const name = result.groups.name;
			let type = null;
			if (result.groups.type == "float") {
				type = Number;
			} else if (result.groups.type == "vec3") {
				type = Vec3;
			}
			yield {name, type};
		}
	}
}
