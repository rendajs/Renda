import {ProjectAssetType} from "./ProjectAssetType.js";
import {MaterialMapPropertiesAssetContent} from "../../propertiesAssetContent/materialMapPropertiesAssetContent/MaterialMapPropertiesAssetContent.js";
import {MaterialMap} from "../../../../src/rendering/MaterialMap.js";
import {StorageType, Vec2, Vec3, Vec4} from "../../../../src/mod.js";
import {objectToBinary} from "../../../../src/util/binarySerialization.js";
import {TextureProjectAssetType} from "./TextureProjectAssetType.js";
import {SamplerProjectAssetType} from "./SamplerProjectAssetType.js";

/**
 * @extends {ProjectAssetType<MaterialMap, null, import("../MaterialMapTypeSerializerManager.js").MaterialMapAssetData>}
 */
export class MaterialMapProjectAssetType extends ProjectAssetType {
	static type = "renda:materialMap";
	static typeUuid = "dd28f2f7-254c-4447-b041-1770ae451ba9";
	static newFileName = "New Material Map";
	static propertiesAssetContentConstructor = MaterialMapPropertiesAssetContent;

	static expectedLiveAssetConstructor = MaterialMap;

	createLiveAssetDataContext() {
		/** @type {import("../materialMapTypeSerializers/MaterialMapTypeSerializer.js").MaterialMapLiveAssetDataContext} */
		const context = {
			editor: this.editorInstance,
			assetManager: this.assetManager,
			materialMapAsset: /** @type {import("../ProjectAsset.js").ProjectAsset<MaterialMapProjectAssetType>} */ (this.projectAsset),
		};
		return context;
	}

	/**
	 * @override
	 * @param {import("../MaterialMapTypeSerializerManager.js").MaterialMapAssetData?} fileData
	 * @param {import("../liveAssetDataRecursionTracker/RecursionTracker.js").RecursionTracker} recursionTracker
	 */
	async getLiveAssetData(fileData, recursionTracker) {
		/** @type {import("../../../../src/rendering/MaterialMap.js").MaterialMapTypeData[]} */
		const materialMapTypes = [];
		if (fileData?.maps) {
			for (const map of fileData.maps) {
				const typeSerializer = this.editorInstance.materialMapTypeSerializerManager.getTypeByUuid(map.mapTypeId);
				if (!typeSerializer) continue;

				const context = this.createLiveAssetDataContext();
				const mapType = await typeSerializer.loadLiveAssetData(context, map.customData);

				if (!mapType) continue;

				/** @type {import("../../../../src/rendering/MaterialMap.js").MaterialMapMappedValues} */
				const mappedValues = {};
				for (const mappedValue of await typeSerializer.getMappableValues(context, map.customData)) {
					let defaultValue = mappedValue.defaultValue;
					if (defaultValue) {
						if (typeof defaultValue == "number") {
							// value doesn't need to be cloned
						} else if (defaultValue instanceof Array) {
							defaultValue = [...defaultValue];
						} else if (defaultValue instanceof Vec2 || defaultValue instanceof Vec3 || defaultValue instanceof Vec4) {
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
						} else if (mappedValue.type == "texture2d") {
							defaultValue = null;
						} else if (mappedValue.type == "sampler") {
							defaultValue = null;
						} else {
							throw new Error("Unknown mapped value type: " + mappedValue.type);
						}
					}
					if (defaultValue !== undefined) {
						mappedValues[mappedValue.name] = {
							mappedName: mappedValue.name,
							defaultValue,
							mappedType: mappedValue.type,
						};
					}
				}
				if (map.mappedValues) {
					for (const [key, mappedValueDiskData] of Object.entries(map.mappedValues)) {
						if (mappedValueDiskData.visible === false) {
							delete mappedValues[key];
						} else {
							if (mappedValueDiskData.mappedName) {
								mappedValues[key].mappedName = mappedValueDiskData.mappedName;
							}
							if (mappedValueDiskData.defaultValue !== undefined) {
								const mappedValue = mappedValues[key];
								if (!mappedValue) {
									throw new Error(`Assertion failed, mapped value "${key}" doesn't exist.`);
								}
								const defaultValue = mappedValue.defaultValue;
								if (mappedValue.mappedType == "number") {
									mappedValue.defaultValue = mappedValueDiskData.defaultValue;
								} else if (mappedValue.mappedType == "vec2" || mappedValue.mappedType == "vec3" || mappedValue.mappedType == "vec4") {
									if (!(defaultValue instanceof Vec2 || defaultValue instanceof Vec3 || defaultValue instanceof Vec4)) {
										throw new Error("Assertion failed, default value is not a vector type.");
									}
									defaultValue.set(mappedValueDiskData.defaultValue);
								} else if (mappedValue.mappedType == "texture2d") {
									mappedValue.defaultValue = await this.assetManager.getLiveAsset(mappedValueDiskData.defaultValue, {
										assertAssetType: TextureProjectAssetType,
									});
								} else if (mappedValue.mappedType == "sampler") {
									mappedValue.defaultValue = await this.assetManager.getLiveAsset(mappedValueDiskData.defaultValue, {
										assertAssetType: SamplerProjectAssetType,
									});
								}
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
			editorData: null,
		};
	}

	/**
	 * @override
	 * @param {MaterialMap?} liveAsset
	 * @param {null} editorData
	 */
	async saveLiveAssetData(liveAsset, editorData) {
		if (!liveAsset) return null;

		/** @type {import("../MaterialMapTypeSerializerManager.js").MaterialMapTypeAssetData[]} */
		const maps = [];
		for (const [mapConstructor, mapInstance] of liveAsset.mapTypes) {
			const mapTypeConstructor = this.editorInstance.materialMapTypeSerializerManager.getTypeByLiveAssetConstructor(mapConstructor);
			if (!mapTypeConstructor) continue;

			/** @type {import("../MaterialMapTypeSerializerManager.js").MaterialMapTypeAssetData} */
			const map = {
				mapTypeId: mapTypeConstructor.typeUuid,
			};

			const context = this.createLiveAssetDataContext();
			const customData = await mapTypeConstructor.saveLiveAssetData(context, mapInstance);
			if (customData) {
				map.customData = customData;
			}

			// TODO: save mapped values

			maps.push(map);
		}
		if (maps.length == 0) return null;
		/** @type {import("../MaterialMapTypeSerializerManager.js").MaterialMapAssetData} */
		const data = {
			maps,
		};
		return data;
	}

	/**
	 * @override
	 * @returns {Promise<string | BufferSource | Blob | null>}
	 */
	async createBundledAssetData() {
		const mapDatas = [];

		/** @type {import("../MaterialMapTypeSerializerManager.js").MaterialMapAssetData} */
		const assetData = await this.projectAsset.readAssetData();
		if (assetData.maps) {
			for (const map of assetData.maps) {
				const mapType = this.editorInstance.materialMapTypeSerializerManager.getTypeByUuid(map.mapTypeId);
				if (!mapType) continue;
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

		return objectToBinary({
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
		/** @type {import("../MaterialMapTypeSerializerManager.js").MaterialMapAssetData} */
		const assetData = await this.projectAsset.readAssetData();
		if (assetData.maps) {
			for (const map of assetData.maps) {
				const mapType = this.editorInstance.materialMapTypeSerializerManager.getTypeByUuid(map.mapTypeId);
				if (!mapType) continue;
				for (const uuid of mapType.getReferencedAssetUuids(map.customData)) {
					yield uuid;
				}
			}
		}
	}
}
