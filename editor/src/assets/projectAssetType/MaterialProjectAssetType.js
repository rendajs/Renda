import {ProjectAssetType} from "./ProjectAssetType.js";
import {Material} from "../../../../src/rendering/Material.js";
import {MaterialPropertiesAssetContent} from "../../propertiesAssetContent/MaterialPropertiesAssetContent.js";
import {mathTypeToJson} from "../../../../src/math/MathTypes.js";
import {StorageType, objectToBinary} from "../../../../src/util/binarySerialization.js";
import {MaterialMapProjectAssetType} from "./MaterialMapProjectAssetType.js";
import {DEFAULT_MATERIAL_MAP_UUID} from "../builtinAssetUuids.js";
import {Texture} from "../../../../src/core/Texture.js";
import {isUuid} from "../../../../src/mod.js";
import {Sampler} from "../../../../src/rendering/Sampler.js";

export const MATERIAL_MAP_PERSISTENCE_KEY = "materialMap";

/**
 * @extends {ProjectAssetType<Material, null, import("../../propertiesAssetContent/MaterialPropertiesAssetContent.js").MaterialAssetData>}
 */
export class MaterialProjectAssetType extends ProjectAssetType {
	static type = "renda:material";
	static typeUuid = "430f47a8-82cc-4b4c-a664-2360794e80d6";
	static newFileName = "New Material";
	static propertiesAssetContentConstructor = MaterialPropertiesAssetContent;

	static expectedLiveAssetConstructor = Material;

	/**
	 * @override
	 * @param {import("../../propertiesAssetContent/MaterialPropertiesAssetContent.js").MaterialAssetData?} materialJson
	 * @returns {Promise<import("./ProjectAssetType.js").LiveAssetData<Material, null>>}
	 */
	async getLiveAssetData(materialJson) {
		let materialMapAsset;
		const mapJson = materialJson?.map;
		if (mapJson) {
			materialMapAsset = await this.assetManager.getProjectAssetFromUuidOrEmbeddedAssetData(mapJson, {
				assertAssetType: MaterialMapProjectAssetType,
				parentAsset: this.projectAsset,
				embeddedAssetPersistenceKey: MATERIAL_MAP_PERSISTENCE_KEY,
			});
		} else if (mapJson === undefined) {
			// If the value is undefined, that means it hasn't been set, so
			// we want to load the default value. The value is only empty
			// if the user has explicitly set the value to null.
			materialMapAsset = await this.assetManager.getProjectAssetFromUuid(DEFAULT_MATERIAL_MAP_UUID, {
				assertAssetType: MaterialMapProjectAssetType,
			});
		}

		let materialMap = null;
		if (materialMapAsset) {
			materialMap = await materialMapAsset.getLiveAsset();
			this.listenForUsedLiveAssetChanges(materialMapAsset);
		}

		/** @type {Object.<string, any>} */
		const properties = {};
		if (materialJson?.properties) {
			for (const [key, value] of Object.entries(materialJson.properties)) {
				if (isUuid(value)) {
					const asset = await this.assetManager.getProjectAssetFromUuid(value);
					this.listenForUsedLiveAssetChanges(asset);
					properties[key] = await asset?.getLiveAsset() ?? null;
				} else {
					properties[key] = value;
				}
			}
		}

		const material = new Material(materialMap, properties);
		return {
			liveAsset: material,
			editorData: null,
		};
	}

	liveAssetNeedsReplacement() {
		super.liveAssetNeedsReplacement();
	}

	/**
	 * @override
	 * @param {Material?} liveAsset
	 * @param {null} editorData
	 */
	async saveLiveAssetData(liveAsset, editorData) {
		/** @type {import("../../propertiesAssetContent/MaterialPropertiesAssetContent.js").MaterialAssetData} */
		const assetData = {};
		if (liveAsset) {
			assetData.map = this.assetManager.getAssetUuidOrEmbeddedAssetDataFromLiveAsset(liveAsset.materialMap);
			if (assetData.map == DEFAULT_MATERIAL_MAP_UUID) {
				delete assetData.map;
			}
		}
		if (liveAsset) {
			/** @type {Object.<string, unknown>} */
			const modifiedProperties = {};
			let hasModifiedProperty = false;
			for (const [key, value] of liveAsset.getAllProperties()) {
				hasModifiedProperty = true;
				let storeValue = null;
				if (value instanceof Texture || value instanceof Sampler) {
					storeValue = this.assetManager.getAssetUuidOrEmbeddedAssetDataFromLiveAsset(value);
				} else {
					const mathType = mathTypeToJson(value);
					if (mathType) {
						storeValue = mathType;
					} else {
						storeValue = value;
					}
				}
				modifiedProperties[key] = storeValue;
			}
			if (hasModifiedProperty) {
				assetData.properties = modifiedProperties;
			}
		}
		return assetData;
	}

	/**
	 * @override
	 */
	async createBundledAssetData() {
		const assetData = await this.projectAsset.readAssetData();
		const mapUuid = assetData.map;
		if (!mapUuid) return "";

		if (typeof mapUuid != "string") {
			throw new Error("Embedded material map asset bundling is not yet supported.");
		}

		return objectToBinary({
			map: mapUuid,
			values: [], // todo
		}, {
			structure: {
				map: StorageType.ASSET_UUID,
				values: [StorageType.INT8],
			},
			nameIds: {
				map: 1,
				values: 2,
			},
		});
	}

	async *getReferencedAssetUuids() {
		const assetData = await this.projectAsset.readAssetData();
		const mapUuid = assetData.map;
		if (typeof mapUuid == "string") yield mapUuid;
	}
}
