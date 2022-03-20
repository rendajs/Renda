import {ProjectAssetType} from "./ProjectAssetType.js";
import {Material} from "../../../../src/rendering/Material.js";
import {PropertiesAssetContentMaterial} from "../../propertiesWindowContent/propertiesAssetContent/PropertiesAssetContentMaterial.js";
import {BinaryComposer, StorageType} from "../../../../src/util/BinaryComposer.js";
import {mathTypeToJson} from "../../../../src/math/MathTypes.js";
import {ProjectAssetTypeMaterialMap} from "./projectAssetTypeMaterialMap/ProjectAssetTypeMaterialMap.js";

/**
 * @extends {ProjectAssetType<Material, null, import("../../propertiesWindowContent/propertiesAssetContent/PropertiesAssetContentMaterial.js").MaterialAssetData>}
 */
export class ProjectAssetTypeMaterial extends ProjectAssetType {
	static type = "JJ:material";
	static typeUuid = "430f47a8-82cc-4b4c-a664-2360794e80d6";
	static newFileName = "New Material";
	static propertiesAssetContentConstructor = PropertiesAssetContentMaterial;

	static expectedLiveAssetConstructor = Material;

	/**
	 * @override
	 * @param {import("../../propertiesWindowContent/propertiesAssetContent/PropertiesAssetContentMaterial.js").MaterialAssetData?} materialJson
	 * @returns {Promise<import("./ProjectAssetType.js").LiveAssetData<Material, null>>}
	 */
	async getLiveAssetData(materialJson) {
		let materialMap = null;
		if (materialJson?.map) {
			const materialMapAsset = await this.assetManager.getProjectAsset(materialJson.map, {
				assertAssetType: ProjectAssetTypeMaterialMap,
			});
			if (materialMapAsset) {
				materialMap = await materialMapAsset.getLiveAsset();
				this.listenForUsedLiveAssetChanges(materialMapAsset);
			}
		}

		const material = new Material(materialMap, materialJson?.properties);
		return {liveAsset: material};
	}

	/**
	 * @override
	 * @param {Material?} liveAsset
	 * @param {null} editorData
	 */
	async saveLiveAssetData(liveAsset, editorData) {
		/** @type {import("../../propertiesWindowContent/propertiesAssetContent/PropertiesAssetContentMaterial.js").MaterialAssetData} */
		const assetData = {};
		let mapUuid = null;
		if (liveAsset) {
			mapUuid = this.assetManager.getAssetUuidFromLiveAsset(liveAsset.materialMap);
		}
		if (mapUuid) {
			assetData.map = mapUuid;
		}
		if (liveAsset) {
			/** @type {Object.<string, unknown>} */
			const modifiedProperties = {};
			let hasModifiedProperty = false;
			for (const [key, value] of liveAsset.getAllProperties()) {
				hasModifiedProperty = true;
				let storeValue = null;
				const mathType = mathTypeToJson(value);
				if (mathType) {
					storeValue = mathType;
				} else {
					storeValue = value;
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
