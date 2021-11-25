import {ProjectAssetType} from "./ProjectAssetType.js";
import {PropertiesAssetContentMaterialMap} from "../../PropertiesWindowContent/PropertiesAssetContent/PropertiesAssetContentMaterialMap/PropertiesAssetContentMaterialMap.js";
import {MaterialMap} from "../../../../src/Rendering/MaterialMap.js";
import {RecursionTracker} from "../LiveAssetDataRecursionTracker/RecursionTracker.js";
import editor from "../../editorInstance.js";
import {MaterialMapType} from "../../../../src/Rendering/MaterialMapType.js";
import {BinaryComposer, StorageType} from "../../../../src/index.js";

export class ProjectAssetTypeMaterialMap extends ProjectAssetType {
	static type = "JJ:materialMap";
	static typeUuid = "dd28f2f7-254c-4447-b041-1770ae451ba9";
	static newFileName = "New Material Map";
	static propertiesAssetContentConstructor = PropertiesAssetContentMaterialMap;

	static expectedLiveAssetConstructor = MaterialMap;

	/**
	 * @override
	 * @param {import("../../Managers/MaterialMapTypeSerializerManager.js").MaterialMapAssetData} fileData
	 * @param {RecursionTracker} recursionTracker
	 */
	async getLiveAssetData(fileData, recursionTracker) {
		/** @type {MaterialMapType[]} */
		const mapTypeSettings = [];
		if (fileData.maps) {
			for (const map of fileData.maps) {
				const mapType = editor.materialMapTypeManager.getTypeByUuid(map.mapTypeId);
				const typeSettings = await mapType.getLiveAssetSettingsInstance(map.customData);
				mapTypeSettings.push(typeSettings);
			}
		}
		const materialMap = new MaterialMap({
			materialMapTypes: mapTypeSettings,
		});
		return {
			liveAsset: materialMap,
		};
	}

	/**
	 * @override
	 */
	async createBundledAssetData() {
		const mapDatas = [];

		/** @type {import("../../Managers/MaterialMapTypeSerializerManager.js").MaterialMapAssetData} */
		const assetData = await this.projectAsset.readAssetData();
		if (assetData.maps) {
			for (const map of assetData.maps) {
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
		}

		return BinaryComposer.objectToBinary({
			mapDatas,
		}, {
			structure: {
				mapDatas: [
					{
						typeUuid: StorageType.UUID,
						data: StorageType.ARRAY_BUFFER,
					},
				],
			},
			nameIds: {
				mapDatas: 1,
				typeUuid: 2,
				data: 3,
			},
		});
	}

	/**
	 * @override
	 */
	async *getReferencedAssetUuids() {
		/** @type {import("../../Managers/MaterialMapTypeSerializerManager.js").MaterialMapAssetData} */
		const assetData = await this.projectAsset.readAssetData();
		if (assetData.maps) {
			for (const map of assetData.maps) {
				const mapType = editor.materialMapTypeManager.getTypeByUuid(map.mapTypeId);
				for (const uuid of mapType.getReferencedAssetUuids(map.customData)) {
					yield uuid;
				}
			}
		}
	}
}
