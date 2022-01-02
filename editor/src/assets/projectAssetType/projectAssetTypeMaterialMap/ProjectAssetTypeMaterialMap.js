import {ProjectAssetType} from "../ProjectAssetType.js";
import {PropertiesAssetContentMaterialMap} from "../../../PropertiesWindowContent/PropertiesAssetContent/PropertiesAssetContentMaterialMap/PropertiesAssetContentMaterialMap.js";
import {MaterialMap} from "../../../../../src/Rendering/MaterialMap.js";
import {RecursionTracker} from "../../liveAssetDataRecursionTracker/RecursionTracker.js";
import {BinaryComposer, StorageType, Vec2, Vec3, Vec4} from "../../../../../src/mod.js";

/**
 * @extends {ProjectAssetType<MaterialMap, null, import("./MaterialMapTypeSerializerManager.js").MaterialMapAssetData>}
 */
export class ProjectAssetTypeMaterialMap extends ProjectAssetType {
	static type = "JJ:materialMap";
	static typeUuid = "dd28f2f7-254c-4447-b041-1770ae451ba9";
	static newFileName = "New Material Map";
	static propertiesAssetContentConstructor = PropertiesAssetContentMaterialMap;

	static expectedLiveAssetConstructor = MaterialMap;

	/**
	 * @override
	 * @param {import("./MaterialMapTypeSerializerManager.js").MaterialMapAssetData} fileData
	 * @param {RecursionTracker} recursionTracker
	 */
	async getLiveAssetData(fileData, recursionTracker) {
		/** @type {import("../../../../../src/Rendering/MaterialMap.js").MaterialMapTypeData[]} */
		const materialMapTypes = [];
		if (fileData.maps) {
			for (const map of fileData.maps) {
				const typeSerializer = this.editorInstance.materialMapTypeManager.getTypeByUuid(map.mapTypeId);
				const mapType = await typeSerializer.getLiveAssetSettingsInstance(this.editorInstance, this.assetManager, map.customData);

				if (!mapType) continue;

				/** @type {import("../../../../../src/Rendering/MaterialMap.js").MaterialMapMappedValues} */
				const mappedValues = {};
				for (const mappedValue of await typeSerializer.getMappableValues(this.editorInstance, this.assetManager, map.customData)) {
					let defaultValue = mappedValue.defaultValue;
					if (defaultValue) {
						if (typeof defaultValue != "number") {
							defaultValue = defaultValue.clone();
						}
					} else {
						if (mappedValue.type == "number") {
							defaultValue = 0;
						} else if (mappedValue.type == "vec2") {
							defaultValue = new Vec2();
						} else if (mappedValue.type == "vec3") {
							defaultValue = new Vec3();
						} else if (mappedValue.type == "vec4") {
							defaultValue = new Vec4();
						}
					}
					if (defaultValue) {
						mappedValues[mappedValue.name] = {
							mappedName: mappedValue.name,
							defaultValue,
						};
					}
				}
				for (const [key, mappedValue] of Object.entries(map.mappedValues)) {
					if (mappedValue.visible == false) {
						delete mappedValues[key];
					} else {
						if (mappedValue.mappedName) {
							mappedValues[key].mappedName = mappedValue.mappedName;
						}
						if (mappedValue.defaultValue !== undefined) {
							const defaultValue = mappedValues[key].defaultValue;
							if (typeof defaultValue == "number") {
								mappedValues[key].defaultValue = mappedValue.defaultValue;
							} else {
								defaultValue.set(mappedValue.defaultValue);
							}
						}
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

		/** @type {import("./MaterialMapTypeSerializerManager.js").MaterialMapAssetData} */
		const assetData = await this.projectAsset.readAssetData();
		if (assetData.maps) {
			for (const map of assetData.maps) {
				const mapType = this.editorInstance.materialMapTypeManager.getTypeByUuid(map.mapTypeId);
				if (mapType.allowExportInAssetBundles) {
					const arrayBuffer = mapType.mapDataToAssetBundleBinary(this.editorInstance, this.assetManager, map.customData);
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
		/** @type {import("./MaterialMapTypeSerializerManager.js").MaterialMapAssetData} */
		const assetData = await this.projectAsset.readAssetData();
		if (assetData.maps) {
			for (const map of assetData.maps) {
				const mapType = this.editorInstance.materialMapTypeManager.getTypeByUuid(map.mapTypeId);
				for (const uuid of mapType.getReferencedAssetUuids(map.customData)) {
					yield uuid;
				}
			}
		}
	}
}
