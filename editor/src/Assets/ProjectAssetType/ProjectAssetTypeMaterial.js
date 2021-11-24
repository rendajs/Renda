import {ProjectAssetType} from "./ProjectAssetType.js";
import {Material} from "../../../../src/index.js";
import {PropertiesAssetContentMaterial} from "../../PropertiesWindowContent/PropertiesAssetContent/PropertiesAssetContentMaterial.js";
import editor from "../../editorInstance.js";
import BinaryComposer, {StorageType} from "../../../../src/Util/BinaryComposer.js";

export class ProjectAssetTypeMaterial extends ProjectAssetType {
	static type = "JJ:material";
	static typeUuid = "430f47a8-82cc-4b4c-a664-2360794e80d6";
	static newFileName = "New Material";
	static propertiesAssetContentConstructor = PropertiesAssetContentMaterial;

	static expectedLiveAssetConstructor = Material;

	/**
	 * @override
	 * @param {*} materialJson
	 */
	async getLiveAssetData(materialJson) {
		let materialMap = null;
		if (materialJson.map) {
			materialMap = await editor.projectManager.assetManager.getLiveAsset(materialJson.map);
		}

		const material = new Material(materialMap);
		return {liveAsset: material};
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
