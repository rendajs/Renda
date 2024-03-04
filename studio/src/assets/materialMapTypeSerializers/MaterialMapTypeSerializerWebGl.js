import { MaterialMapTypeSerializer } from "./MaterialMapTypeSerializer.js";
import { ShaderSource } from "../../../../src/mod.js";
import { StorageType } from "../../../../src/util/binarySerialization.js";
import { ProjectAssetTypeShaderSource } from "../projectAssetType/ProjectAssetTypeShaderSource.js";

export class MaterialMapTypeSerializerWebGl extends MaterialMapTypeSerializer {
	static uiName = "WebGL Renderer";
	static typeUuid = "392a2a4e-c895-4245-9c6d-d6259b8e5267";
	static allowExportInAssetBundles = true;

	constructor() {
		super();

		/** @type {import("../../ui/propertiesTreeView/types.ts").PropertiesTreeViewStructure} */
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
	 * @param {import("../../Studio.js").Studio} studioInstance
	 * @param {import("../AssetManager.js").AssetManager} assetManager
	 * @param {*} customData
	 */
	static async *getLinkedAssetsInCustomData(studioInstance, assetManager, customData) {
		const vertexAsset = await assetManager.getProjectAssetFromUuid(customData.vertexShader, {
			assertAssetType: ProjectAssetTypeShaderSource,
		});
		if (vertexAsset) yield vertexAsset;
		const fragmentAsset = await assetManager.getProjectAssetFromUuid(customData.fragmentShader, {
			assertAssetType: ProjectAssetTypeShaderSource,
		});
		if (fragmentAsset) yield fragmentAsset;
	}

	static assetBundleBinarySerializationOpts = {
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
	 * @typedef {import("../../../../src/rendering/MaterialMap.js").MappableMaterialTypesEnum} MappableMaterialTypesEnum
	 */

	/**
	 * @override
	 * @param {import("./MaterialMapTypeSerializer.js").MaterialMapLiveAssetDataContext} context
	 * @param {*} customData
	 */
	static async getMappableValues(context, customData) {
		/** @type {Map<string, {type: MappableMaterialTypesEnum}>} */
		const itemsMap = new Map();
		await this.addShaderUniformsToMap(context.assetManager, customData.vertexShader, itemsMap);
		await this.addShaderUniformsToMap(context.assetManager, customData.fragmentShader, itemsMap);

		const items = [];
		for (const [name, itemData] of itemsMap) {
			const type = itemData.type;
			items.push({ name, type });
		}
		return items;
	}

	/**
	 * @param {import("../AssetManager.js").AssetManager} assetManager
	 * @param {import("../../../../src/mod.js").UuidString} shaderUuid
	 * @param {Map<string, {type: MappableMaterialTypesEnum}>} itemsMap
	 */
	static async addShaderUniformsToMap(assetManager, shaderUuid, itemsMap) {
		const shaderAsset = await assetManager.getProjectAssetFromUuid(shaderUuid, {
			assertAssetType: ProjectAssetTypeShaderSource,
		});
		for (const { name, type } of await this.getMapItemsIteratorFromShaderAsset(shaderAsset)) {
			itemsMap.set(name, { type });
		}
	}

	/**
	 * @param {import("../ProjectAsset.js").ProjectAsset<import("../projectAssetType/ProjectAssetTypeShaderSource.js").ProjectAssetTypeShaderSource>?} asset
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
			/** @type {MappableMaterialTypesEnum?} */
			let type = null;
			if (result.groups.type == "float") {
				type = "number";
			} else if (result.groups.type == "vec3") {
				type = "vec3";
			}
			if (type) {
				yield { name, type };
			}
		}
	}
}
