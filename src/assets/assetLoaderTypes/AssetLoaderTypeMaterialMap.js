import {isUuid} from "../../util/util.js";
import {StorageType, binaryToObjectWithAssetLoader, createObjectToBinaryOptions} from "../../util/binarySerialization.js";
import {MaterialMap} from "../../rendering/MaterialMap.js";
import {MaterialMapTypeLoader} from "../MaterialMapTypeLoader.js";
import {AssetLoaderType} from "./AssetLoaderType.js";
import {Vec2} from "../../math/Vec2.js";
import {Vec3} from "../../math/Vec3.js";
import {Vec4} from "../../math/Vec4.js";
import { Sampler } from "../../rendering/Sampler.js";
import { Texture } from "../../core/Texture.js";

export const materialMapBinaryOptions = createObjectToBinaryOptions({
	structure: {
		mapDatas: [
			{
				typeUuid: StorageType.UUID,
				data: StorageType.ARRAY_BUFFER,
				mappedValues: [
					{
						originalName: StorageType.STRING,
						mappedName: StorageType.STRING,
						typeUnion: [
							StorageType.UNION_ARRAY,
							{
								isNumber: StorageType.BOOL,
								defaultValue: StorageType.FLOAT64,
							},
							{
								isVec2: StorageType.BOOL,
								defaultValue: [StorageType.FLOAT64],
							},
							{
								isVec3: StorageType.BOOL,
								defaultValue: [StorageType.FLOAT64],
							},
							{
								isVec4: StorageType.BOOL,
								defaultValue: [StorageType.FLOAT64],
							},
							{
								isSampler: StorageType.BOOL,
								defaultValue: StorageType.ASSET_UUID,
							},
							{
								isNullSampler: StorageType.BOOL,
							},
							{
								isTexture: StorageType.BOOL,
								defaultValue: StorageType.ASSET_UUID,
							},
							{
								isColorTexture: StorageType.BOOL,
								defaultValue: [StorageType.FLOAT64],
							},
							{
								isNullTexture: StorageType.BOOL,
							},
						],
					},
				],
			},
		],
	},
	nameIds: {
		mapDatas: 1,
		typeUuid: 2,
		data: 3,
		mappedValues: 4,
		originalName: 5,
		mappedName: 6,
		typeUnion: 7,
		defaultValue: 8,
		isNumber: 9,
		isVec2: 10,
		isVec3: 11,
		isVec4: 12,
		isSampler: 13,
		isNullSampler: 14,
		isTexture: 15,
		isColorTexture: 16,
		isNullTexture: 17,
	},
});

export class AssetLoaderTypeMaterialMap extends AssetLoaderType {
	static get typeUuid() {
		return "dd28f2f7-254c-4447-b041-1770ae451ba9";
	}

	/**
	 * @param  {ConstructorParameters<typeof AssetLoaderType>} args
	 */
	constructor(...args) {
		super(...args);

		/** @type {Map<import("../../util/util.js").UuidString, MaterialMapTypeLoader>} */
		this.registeredLoaderTypes = new Map();
	}

	/**
	 * @override
	 * @param {ArrayBuffer} buffer
	 */
	async parseBuffer(buffer) {
		const materialMapData = await binaryToObjectWithAssetLoader(buffer, this.assetLoader, materialMapBinaryOptions);

		/** @type {import("../../rendering/MaterialMap.js").MaterialMapTypeData[]} */
		const materialMapTypes = [];
		for (const mapData of materialMapData.mapDatas) {
			const mapLoader = this.registeredLoaderTypes.get(mapData.typeUuid);
			if (!mapLoader) {
				// todo: remove this warning in release builds
				console.warn(`Unable to load material map, no mapLoader found for ${mapData.typeUuid}. Make sure to add a MaterialMapTypeLoader using registerMaterialMapTypeLoader()`);
				continue;
			}
			const mapType = await mapLoader.parseBuffer(mapData.data);
			if (mapType) {
				/** @type {import("../../rendering/MaterialMap.js").MaterialMapMappedValues} */
				const mappedValues = {};
				for (const mappedValue of mapData.mappedValues) {
					const mappedName = mappedValue.mappedName || mappedValue.originalName;
					/** @type {import("../../rendering/MaterialMap.js").MappableMaterialTypesEnum} */
					let mappedType;
					/** @type {import("../../rendering/MaterialMap.js").MappableMaterialTypes} */
					let defaultValue;
					if ("isNumber" in mappedValue.typeUnion) {
						mappedType = "number";
						defaultValue = mappedValue.typeUnion.defaultValue;
					} else if ("isVec2" in mappedValue.typeUnion) {
						mappedType = "vec2";
						defaultValue = new Vec2(mappedValue.typeUnion.defaultValue);
					} else if ("isVec3" in mappedValue.typeUnion) {
						mappedType = "vec3";
						defaultValue = new Vec3(mappedValue.typeUnion.defaultValue);
					} else if ("isVec4" in mappedValue.typeUnion) {
						mappedType = "vec4";
						defaultValue = new Vec4(mappedValue.typeUnion.defaultValue);
					} else if ("isSampler" in mappedValue.typeUnion) {
						mappedType = "sampler";
						if (!(mappedValue.typeUnion.defaultValue instanceof Sampler)) {
							throw new Error("Assertion failed, expected a sampler asset.");
						}
						defaultValue = mappedValue.typeUnion.defaultValue;
					} else if ("isNullSampler" in mappedValue.typeUnion) {
						mappedType = "sampler";
						defaultValue = null;
					} else if ("isTexture" in mappedValue.typeUnion) {
						mappedType = "texture2d";
						if (!(mappedValue.typeUnion.defaultValue instanceof Texture)) {
							throw new Error("Assertion failed, expected a texture asset.");
						}
						defaultValue = mappedValue.typeUnion.defaultValue;
					} else if ("isColorTexture" in mappedValue.typeUnion) {
						mappedType = "texture2d";
						defaultValue = new Vec4(mappedValue.typeUnion.defaultValue);
					} else if ("isNullTexture" in mappedValue.typeUnion) {
						mappedType = "texture2d";
						defaultValue = null;
					} else {
						throw new Error("Failed to load material map, unknown value type.");
					}
					mappedValues[mappedValue.originalName] = {
						mappedName,
						mappedType,
						defaultValue,
					};
				}
				materialMapTypes.push({
					mapType,
					mappedValues,
				});
			}
		}
		const material = new MaterialMap({
			materialMapTypes,
		});
		return material;
	}

	/**
	 * @param {new (...args: any) => MaterialMapTypeLoader} constructor
	 */
	registerMaterialMapTypeLoader(constructor) {
		// todo: remove these warnings in release builds?
		if (!(constructor.prototype instanceof MaterialMapTypeLoader)) {
			throw new Error(`Unable to register MaterialMapTypeLoader "${constructor.name}" because it doesn't extend the MaterialMapTypeLoader class.`);
		}

		const castConstructor = /** @type {typeof MaterialMapTypeLoader} */ (constructor);

		if (!isUuid(castConstructor.typeUuid)) {
			throw new Error(`Unable to register MaterialMapTypeLoader "${constructor.name}" because it doesn't have a valid uuid for the static 'typeUuid' set ("${castConstructor.typeUuid}").`);
		}

		const instance = new constructor(this.assetLoader, this);
		this.registeredLoaderTypes.set(castConstructor.typeUuid, instance);
	}
}
