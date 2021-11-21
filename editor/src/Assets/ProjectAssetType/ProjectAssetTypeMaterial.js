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

	async getLiveAssetData(materialJson) {
		let customMapDatas = null;
		if (materialJson.map) {
			const map = await editor.projectManager.assetManager.getProjectAsset(materialJson.map);
			const {mapDatas, linkedProjectAssets} = await editor.materialMapTypeManager.getDataForMapProjectAsset(map);
			customMapDatas = mapDatas;
			for (const projectAsset of linkedProjectAssets) {
				this.listenForUsedLiveAssetChanges(projectAsset);
			}
		}

		const material = new Material({
			customMapDatas,
		});
		return {liveAsset: material};
	}

	async createBundledAssetData() {
		const assetData = await this.projectAsset.readAssetData();
		const mapUuid = assetData.map;
		if (!mapUuid) return "";
		const mapDatas = [];

		const mapAsset = await editor.projectManager.assetManager.getProjectAsset(mapUuid);
		const mapData = await mapAsset.readAssetData();
		for (const map of mapData.maps) {
			const mapType = editor.materialMapTypeManager.getTypeByUuid(map.mapTypeId);
			if (mapType.allowExportInAssetBundles) {
				const arrayBuffer = mapType.mapDataToAssetBundleBinary(map.customData);
				if (!arrayBuffer) continue;
				mapDatas.push({
					typeUuid: map.mapTypeId,
					data: arrayBuffer,
				});
			}
		}

		return BinaryComposer.objectToBinary({
			values: [], // todo
			mapDatas,
		}, {
			structure: {
				values: [StorageType.INT8],
				mapDatas: [
					{
						typeUuid: StorageType.UUID,
						data: StorageType.ARRAY_BUFFER,
					},
				],
			},
			nameIds: {
				values: 1,
				mapDatas: 2,
				typeUuid: 3,
				data: 4,
			},
		});
	}

	async *getReferencedAssetUuids() {
		const assetData = await this.projectAsset.readAssetData();
		const mapUuid = assetData.map;
		if (!mapUuid) return;

		const mapAsset = await editor.projectManager.assetManager.getProjectAsset(mapUuid);
		const mapData = await mapAsset.readAssetData();
		for (const map of mapData.maps) {
			const mapType = editor.materialMapTypeManager.getTypeByUuid(map.mapTypeId);
			for (const uuid of mapType.getReferencedAssetUuids(map.customData)) {
				yield uuid;
			}
		}
	}
}
