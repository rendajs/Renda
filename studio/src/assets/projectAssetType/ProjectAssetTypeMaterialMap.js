import { ProjectAssetType } from "./ProjectAssetType.js";
import { PropertiesAssetContentMaterialMap } from "../../propertiesAssetContent/propertiesAssetContentMaterialMap/PropertiesAssetContentMaterialMap.js";
import { MaterialMap } from "../../../../src/rendering/MaterialMap.js";
import { Vec2, Vec3, Vec4, isUuid } from "../../../../src/mod.js";
import { objectToBinary } from "../../../../src/util/binarySerialization.js";
import { ProjectAssetTypeTexture } from "./ProjectAssetTypeTexture.js";
import { ProjectAssetTypeSampler } from "./ProjectAssetTypeSampler.js";
import { materialMapBinaryOptions } from "../../../../src/assets/assetLoaderTypes/AssetLoaderTypeMaterialMap.js";
import { Sampler } from "../../../../src/rendering/Sampler.js";
import { Texture } from "../../../../src/core/Texture.js";

/**
 * @extends {ProjectAssetType<MaterialMap, null, import("../MaterialMapTypeSerializerManager.js").MaterialMapAssetData>}
 */
export class ProjectAssetTypeMaterialMap extends ProjectAssetType {
	static type = "renda:materialMap";
	static typeUuid = "dd28f2f7-254c-4447-b041-1770ae451ba9";
	static newFileName = "New Material Map";
	static propertiesAssetContentConstructor = PropertiesAssetContentMaterialMap;

	static expectedLiveAssetConstructor = MaterialMap;

	/** @type {import("../../tasks/task/TaskGenerateServices.js").AssetLoaderTypeImportConfig} */
	static assetLoaderTypeImportConfig = {
		identifier: "AssetLoaderTypeMaterialMap",
		instanceIdentifier: "materialMapLoader",
		extra(ctx) {
			ctx.addImport("WebGpuMaterialMapTypeLoader", "renda");
			return `materialMapLoader.registerMaterialMapTypeLoader(WebGpuMaterialMapTypeLoader);`;
		},
	};

	createLiveAssetDataContext() {
		/** @type {import("../materialMapTypeSerializers/MaterialMapTypeSerializer.js").MaterialMapLiveAssetDataContext} */
		const context = {
			studio: this.studioInstance,
			assetManager: this.assetManager,
			materialMapAsset: /** @type {import("../ProjectAsset.js").ProjectAsset<ProjectAssetTypeMaterialMap>} */ (this.projectAsset),
		};
		return context;
	}

	/**
	 * @param {import("../MaterialMapTypeSerializerManager.js").MaterialMapTypeAssetData} mapAssetData
	 */
	async #getMappedValuesFromAssetData(mapAssetData) {
		const typeSerializer = this.studioInstance.materialMapTypeSerializerManager.getTypeByUuid(mapAssetData.mapTypeId);
		if (!typeSerializer) return null;

		const context = this.createLiveAssetDataContext();
		const mapType = await typeSerializer.loadLiveAssetData(context, mapAssetData.customData);
		if (!mapType) return null;

		/** @type {import("../../../../src/rendering/MaterialMap.js").MaterialMapMappedValues} */
		const mappedValues = {};
		for (const mappedValue of await typeSerializer.getMappableValues(context, mapAssetData.customData)) {
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
				} else if (mappedValue.type == "enum") {
					if (mappedValue.enumOptions && mappedValue.enumOptions.length > 0) {
						defaultValue = mappedValue.enumOptions[0];
					} else {
						defaultValue = "";
					}
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
		if (mapAssetData.mappedValues) {
			for (const [key, mappedValueDiskData] of Object.entries(mapAssetData.mappedValues)) {
				if (mappedValueDiskData.visible === false) {
					delete mappedValues[key];
				} else {
					if (mappedValueDiskData.mappedName) {
						if (mappedValues[key]) {
							mappedValues[key].mappedName = mappedValueDiskData.mappedName;
						}
					}
					if (mappedValueDiskData.defaultValue !== undefined) {
						const mappedValue = mappedValues[key];
						if (!mappedValue) continue;
						const defaultValue = mappedValue.defaultValue;
						if (mappedValue.mappedType == "number" || mappedValue.mappedType == "enum") {
							mappedValue.defaultValue = mappedValueDiskData.defaultValue;
						} else if (mappedValue.mappedType == "vec2" || mappedValue.mappedType == "vec3" || mappedValue.mappedType == "vec4") {
							if (!(defaultValue instanceof Vec2 || defaultValue instanceof Vec3 || defaultValue instanceof Vec4)) {
								throw new Error("Assertion failed, default value is not a vector type.");
							}
							defaultValue.set(mappedValueDiskData.defaultValue);
						} else if (mappedValue.mappedType == "texture2d") {
							if (Array.isArray(mappedValueDiskData.defaultValue)) {
								mappedValue.defaultValue = mappedValueDiskData.defaultValue;
							} else {
								mappedValue.defaultValue = await this.assetManager.getLiveAsset(mappedValueDiskData.defaultValue, {
									assertAssetType: ProjectAssetTypeTexture,
								});
							}
						} else if (mappedValue.mappedType == "sampler") {
							mappedValue.defaultValue = await this.assetManager.getLiveAsset(mappedValueDiskData.defaultValue, {
								assertAssetType: ProjectAssetTypeSampler,
							});
						}
					}
				}
			}
		}
		return { mapType, mappedValues };
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
				const mappedValuesData = await this.#getMappedValuesFromAssetData(map);
				if (!mappedValuesData) continue;
				const { mapType, mappedValues } = mappedValuesData;

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
			studioData: null,
		};
	}

	/**
	 * @override
	 * @param {MaterialMap?} liveAsset
	 * @param {null} studioData
	 */
	async saveLiveAssetData(liveAsset, studioData) {
		if (!liveAsset) return null;

		/** @type {import("../MaterialMapTypeSerializerManager.js").MaterialMapTypeAssetData[]} */
		const maps = [];
		for (const [mapConstructor, mapInstance] of liveAsset.mapTypes) {
			const mapTypeConstructor = this.studioInstance.materialMapTypeSerializerManager.getTypeByLiveAssetConstructor(mapConstructor);
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
		/**
		 * @type {import("../../../../src/util/binarySerializationTypes.ts").OptionsToObject<typeof materialMapBinaryOptions, false>}
		 */
		const objectToBinaryData = {
			mapDatas: [],
		};

		const assetData = await this.projectAsset.readAssetData();
		if (assetData.maps) {
			for (const mapAssetData of assetData.maps) {
				const mapTypeSerializer = this.studioInstance.materialMapTypeSerializerManager.getTypeByUuid(mapAssetData.mapTypeId);
				if (!mapTypeSerializer) continue;
				if (mapTypeSerializer.allowExportInAssetBundles) {
					const mappedValuesData = await this.#getMappedValuesFromAssetData(mapAssetData);
					if (!mappedValuesData) continue;

					let arrayBuffer = mapTypeSerializer.mapDataToAssetBundleBinary(this.studioInstance, this.assetManager, mapAssetData.customData);
					if (!arrayBuffer) {
						arrayBuffer = new ArrayBuffer(0);
					}
					/** @type {(typeof objectToBinaryData)["mapDatas"][0]["mappedValues"]} */
					const mappedValues = [];
					if (mappedValuesData.mappedValues && mapAssetData.mappedValues) {
						for (const [originalName, mappedValue] of Object.entries(mappedValuesData.mappedValues)) {
							const mappedValueAssetData = mapAssetData.mappedValues[originalName] || {};
							/** @type {(typeof mappedValues)[0]["typeUnion"]} */
							let typeUnion;
							if (mappedValue.mappedType == "number") {
								if (typeof mappedValue.defaultValue != "number") {
									throw new Error("Assertion failed: unexpected default value type");
								}
								typeUnion = {
									isNumber: true,
									defaultValue: mappedValue.defaultValue,
								};
							} else if (mappedValue.mappedType == "vec2") {
								if (!(mappedValue.defaultValue instanceof Vec2)) {
									throw new Error("Assertion failed, expected a Vec2 as default value");
								}
								typeUnion = {
									isVec2: true,
									defaultValue: mappedValue.defaultValue.toArray(),
								};
							} else if (mappedValue.mappedType == "vec3") {
								if (!(mappedValue.defaultValue instanceof Vec3)) {
									throw new Error("Assertion failed, expected a Vec3 as default value");
								}
								typeUnion = {
									isVec3: true,
									defaultValue: mappedValue.defaultValue.toArray(),
								};
							} else if (mappedValue.mappedType == "vec4") {
								if (!(mappedValue.defaultValue instanceof Vec4)) {
									throw new Error("Assertion failed, expected a Vec4 as default value");
								}
								typeUnion = {
									isVec4: true,
									defaultValue: mappedValue.defaultValue.toArray(),
								};
							} else if (mappedValue.mappedType == "enum") {
								if (typeof mappedValue.defaultValue != "string") {
									throw new Error("Assertion failed, expected a string as default value");
								}
								typeUnion = {
									isEnum: true,
									defaultValue: mappedValue.defaultValue,
								};
							} else if (mappedValue.mappedType == "sampler") {
								if (!mappedValue.defaultValue) {
									typeUnion = {
										isNullSampler: true,
									};
								} else {
									if (!(mappedValue.defaultValue instanceof Sampler)) {
										throw new Error("Assertion failed, expected a Sampler as default value");
									}
									if (!isUuid(mappedValueAssetData.defaultValue)) {
										throw new Error("Assertion failed, expected a uuid as default value");
									}
									typeUnion = {
										isSampler: true,
										defaultValue: mappedValueAssetData.defaultValue,
									};
								}
							} else if (mappedValue.mappedType == "texture2d") {
								if (!mappedValue.defaultValue) {
									typeUnion = {
										isNullTexture: true,
									};
								} else if (mappedValue.defaultValue instanceof Texture) {
									if (!isUuid(mappedValueAssetData.defaultValue)) {
										throw new Error("Assertion failed, expected a uuid as default value");
									}
									typeUnion = {
										isTexture: true,
										defaultValue: mappedValueAssetData.defaultValue,
									};
								} else if (Array.isArray(mappedValue.defaultValue)) {
									typeUnion = {
										isColorTexture: true,
										defaultValue: mappedValue.defaultValue,
									};
								} else {
									throw new Error("Assertion failed, unexpected default value type");
								}
							} else {
								throw new Error(`Unexpected mapped type for "${originalName}": ${mappedValue.mappedType}`);
							}
							mappedValues.push({
								originalName,
								mappedName: mappedValueAssetData.mappedName || "",
								typeUnion,
							});
						}
					}
					objectToBinaryData.mapDatas.push({
						typeUuid: mapAssetData.mapTypeId,
						data: arrayBuffer,
						mappedValues,
					});
				}
			}
		}

		return objectToBinary(objectToBinaryData, materialMapBinaryOptions);
	}

	/**
	 * @override
	 */
	async *getReferencedAssetUuids() {
		/** @type {import("../MaterialMapTypeSerializerManager.js").MaterialMapAssetData} */
		const assetData = await this.projectAsset.readAssetData();
		if (assetData.maps) {
			for (const mapAssetData of assetData.maps) {
				const mapTypeSerializer = this.studioInstance.materialMapTypeSerializerManager.getTypeByUuid(mapAssetData.mapTypeId);
				if (!mapTypeSerializer) continue;
				if (mapTypeSerializer.allowExportInAssetBundles) {
					const mappedValuesData = await this.#getMappedValuesFromAssetData(mapAssetData);
					if (mappedValuesData) {
						if (mappedValuesData.mappedValues && mapAssetData.mappedValues) {
							for (const [originalName, mappedValue] of Object.entries(mappedValuesData.mappedValues)) {
								const mappedValueAssetData = mapAssetData.mappedValues[originalName] || {};
								if (mappedValue.mappedType == "sampler" || mappedValue.mappedType == "texture2d") {
									if (isUuid(mappedValueAssetData.defaultValue)) yield mappedValueAssetData.defaultValue;
								}
							}
						}
					}
				}
				for (const uuid of mapTypeSerializer.getReferencedAssetUuids(mapAssetData.customData)) {
					yield uuid;
				}
			}
		}
	}
}
