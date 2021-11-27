import {ProjectAssetType} from "../ProjectAssetType.js";
import {PropertiesAssetContentMaterialMap} from "../../../PropertiesWindowContent/PropertiesAssetContent/PropertiesAssetContentMaterialMap/PropertiesAssetContentMaterialMap.js";
import {MaterialMap} from "../../../../../src/Rendering/MaterialMap.js";
import {RecursionTracker} from "../../LiveAssetDataRecursionTracker/RecursionTracker.js";
import editor from "../../../editorInstance.js";
import {BinaryComposer, StorageType, Vec2, Vec3, Vec4} from "../../../../../src/index.js";

export class ProjectAssetTypeMaterialMap extends ProjectAssetType {
	static type = "JJ:materialMap";
	static typeUuid = "dd28f2f7-254c-4447-b041-1770ae451ba9";
	static newFileName = "New Material Map";
	static propertiesAssetContentConstructor = PropertiesAssetContentMaterialMap;

	static expectedLiveAssetConstructor = MaterialMap;

	/**
	 * @override
	 * @param {import("../../../Managers/MaterialMapTypeSerializerManager.js").MaterialMapAssetData} fileData
	 * @param {RecursionTracker} recursionTracker
	 */
	async getLiveAssetData(fileData, recursionTracker) {
		/** @type {import("../../../../../src/Rendering/MaterialMap.js").MaterialMapTypeData[]} */
		const materialMapTypes = [];
		if (fileData.maps) {
			for (const map of fileData.maps) {
				const typeSerializer = editor.materialMapTypeManager.getTypeByUuid(map.mapTypeId);
				const mapType = await typeSerializer.getLiveAssetSettingsInstance(map.customData);
				/** @type {import("../../../../../src/Rendering/MaterialMap.js").MaterialMapMappedValues} */
				const mappedValues = {};
				/** @type {Object.<string, import("../../../UI/PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewEntryType>} */
				const types = {};
				for (const mappedValue of await typeSerializer.getMappableValues(map.customData)) {
					mappedValues[mappedValue.name] = {
						mappedName: mappedValue.name,
						defaultValue: mappedValue.defaultValue,
					};
					types[mappedValue.name] = mappedValue.type;
				}
				for (const [key, mappedValue] of Object.entries(map.mappedValues)) {
					if (mappedValue.visible == false) {
						delete mappedValues[key];
					} else {
						if (mappedValue.mappedName) {
							mappedValues[key].mappedName = mappedValue.mappedName;
						}
						if (mappedValue.defaultValue !== undefined) {
							mappedValues[key].defaultValue = mappedValue.defaultValue;
						}
					}
				}
				for (const [key, mappedValue] of Object.entries(mappedValues)) {
					const type = types[key];
					if (type == "vec2") {
						mappedValue.defaultValue = new Vec2(mappedValue.defaultValue);
					} else if (type == "vec3") {
						mappedValue.defaultValue = new Vec3(mappedValue.defaultValue);
					} else if (type == "vec4") {
						mappedValue.defaultValue = new Vec4(mappedValue.defaultValue);
					}
				}
				materialMapTypes.push({
					mapType,
					mappedValues,
				});
			}
		}
		const materialMap = new MaterialMap({
			materialMapTypes,
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

		/** @type {import("../../../Managers/MaterialMapTypeSerializerManager.js").MaterialMapAssetData} */
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
		/** @type {import("../../../Managers/MaterialMapTypeSerializerManager.js").MaterialMapAssetData} */
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
