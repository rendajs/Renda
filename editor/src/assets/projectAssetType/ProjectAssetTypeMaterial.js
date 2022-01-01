import {ProjectAssetType} from "./ProjectAssetType.js";
import {Material} from "../../../../src/mod.js";
import {PropertiesAssetContentMaterial} from "../../PropertiesWindowContent/PropertiesAssetContent/PropertiesAssetContentMaterial.js";
import {BinaryComposer, StorageType} from "../../../../src/util/BinaryComposer.js";
import {mathTypeToJson} from "../../../../src/Math/MathTypes.js";

/**
 * @extends {ProjectAssetType<Material, null, import("../../PropertiesWindowContent/PropertiesAssetContent/PropertiesAssetContentMaterial.js").MaterialAssetData>}
 */
export class ProjectAssetTypeMaterial extends ProjectAssetType {
	static type = "JJ:material";
	static typeUuid = "430f47a8-82cc-4b4c-a664-2360794e80d6";
	static newFileName = "New Material";
	static propertiesAssetContentConstructor = PropertiesAssetContentMaterial;

	static expectedLiveAssetConstructor = Material;

	/**
	 * @override
	 * @param {*} materialJson
	 * @returns {Promise<import("./ProjectAssetType.js").LiveAssetData<Material, null>>}
	 */
	async getLiveAssetData(materialJson) {
		let materialMap = null;
		if (materialJson.map) {
			/** @type {import("../ProjectAsset.js").ProjectAsset<import("./projectAssetTypeMaterialMap/ProjectAssetTypeMaterialMap.js").ProjectAssetTypeMaterialMap>?} */
			const materialMapAsset = await this.assetManager.getProjectAsset(materialJson.map);
			if (materialMapAsset) {
				materialMap = await materialMapAsset.getLiveAsset();
				this.listenForUsedLiveAssetChanges(materialMapAsset);
			}
		}

		const material = new Material(materialMap, materialJson.properties);
		return {liveAsset: material};
	}

	/**
	 * @param {Material} liveAsset
	 * @override
	 */
	async saveLiveAssetData(liveAsset) {
		/** @type {import("../../PropertiesWindowContent/PropertiesAssetContent/PropertiesAssetContentMaterial.js").MaterialAssetData} */
		const assetData = {};
		const mapUuid = this.assetManager.getAssetUuidFromLiveAsset(liveAsset.materialMap);
		if (mapUuid) {
			assetData.map = mapUuid;
		}
		/** @type {Object.<any, any>} */
		const modifiedProperties = {};
		let hasModifiedProperty = false;
		for (const [key, value] of liveAsset.getAllProperties()) {
			hasModifiedProperty = true;
			let storeValue = value;
			const mathType = mathTypeToJson(value);
			if (mathType) {
				storeValue = mathType;
			}
			modifiedProperties[key] = storeValue;
		}
		if (hasModifiedProperty) {
			assetData.properties = modifiedProperties;
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

		return BinaryComposer.objectToBinary({
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
		if (mapUuid) yield mapUuid;
	}
}
