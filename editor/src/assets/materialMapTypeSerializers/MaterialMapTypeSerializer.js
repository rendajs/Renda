import {StorageType, objectToBinary} from "../../../../src/util/binarySerialization.js";

/**
 * @typedef {new (...args: any) => MaterialMapTypeSerializer} MaterialMapTypeSerializerConstructor
 */

/**
 * @typedef {Object} MaterialMapTypeMappableValue
 * @property {string} name
 * @property {import("../../ui/propertiesTreeView/types.js").GuiTypes} type
 * @property {import("../../../../src/rendering/MaterialMap.js").MappableMaterialTypes} [defaultValue]
 */

/**
 * @typedef MaterialMapLiveAssetDataContext
 * @property {import("../../Editor.js").Editor} editor
 * @property {import("../AssetManager.js").AssetManager} assetManager
 * @property {import("../ProjectAsset.js").ProjectAsset<import("../projectAssetType/MaterialMapProjectAssetType.js").MaterialMapProjectAssetType>} materialMapAsset
 */

/**
 * Registered MaterialMapTypes with MaterialMapTypeManager.registerMapType should
 * extend this class. Extended classes are responsible for converting data between
 * what's stored on disk, in memory in live assets, or as binary in assetbundles.
 */
export class MaterialMapTypeSerializer {
	/**
	 * Name that will be shown in the editor ui.
	 * @type {string}
	 */
	static uiName = "";

	/**
	 * This will be used for storing the map type in the MaterialMap asset.
	 * You can generate a uuid in the editor browser console using `Util.generateUuid()`.
	 * @type {import("../../../../src/util/mod.js").UuidString}
	 */
	static typeUuid = "";

	/**
	 * Used for determining the uuid when saving live asset data.
	 * @type {(new (...args: any) => import("../../../../src/rendering/MaterialMapType.js").MaterialMapType)?}
	 */
	static expectedLiveAssetConstructor = null;

	/**
	 * If you set this to true you should at least implement {@link mapDataToAssetBundleBinary}
	 * or set a structure in {@link assetBundleBinarySerializationOpts}.
	 */
	static allowExportInAssetBundles = false;

	/**
	 * Set this to a structure to automatically load and save data for this map type.
	 * This is optional if {@link propertiesMaterialMapContentConstructor} is set.
	 * @type {import("../../ui/propertiesTreeView/types.js").PropertiesTreeViewStructure?}
	 */
	static settingsStructure = null;

	/**
	 * If you prefer more control, you can set this to the constructor of an PropertiesMaterialMapContent.
	 * This is optional if {@link settingsStructure} is set.
	 * Replace this with a constructor that extends {@link PropertiesMaterialMapContent}.
	 * This will be used to render the material map settings in the properties window.
	 * @type {typeof import("../../propertiesMaterialMapContent/PropertiesMaterialMapContent.js").PropertiesMaterialMapContent?}
	 */
	static propertiesMaterialMapContentConstructor = null;

	/**
	 * This will be used to render the mapping ui in MaterialMaps, as well as
	 * the values ui in Materials. The values of materials will be automatically
	 * loaded, saved and exported in assetbundles.
	 * `customData` will be whatever you last returned from
	 * {@link getCustomAssetDataForSave}.
	 * @param {MaterialMapLiveAssetDataContext} context
	 * @param {*} customData The customData as stored on disk.
	 * @returns {Promise<MaterialMapTypeMappableValue[]>}
	 */
	static async getMappableValues(context, customData) {
		return [];
	}

	/* ==== Material instance related methods ==== */

	/**
	 * Use this to convert customData as stored on disk to an instance of `MaterialMapType` that lives in Material instances.
	 * This is where you can convert the plain disk data to live asset data and load any asset uuids
	 * using the provided assetManager.
	 *
	 * @param {MaterialMapLiveAssetDataContext} context
	 * @param {any} customData The customData as stored on disk.
	 * @returns {Promise<import("../../../../src/rendering/MaterialMapType.js").MaterialMapType?>} The data to be stored in the Material.
	 */
	static async loadLiveAssetData(context, customData) {
		return null;
	}

	/**
	 * Use this to save live asset data to disk. This gets called when the material map live asset is changed.
	 * This should return an object representable by json, all assets used by the material map should either
	 * be converted to a uuid, or if embedded assets are supported, use an embedded asset structure.
	 * You can use `assetManager.getAssetUuidOrEmbeddedAssetDataFromLiveAsset()` for this.
	 *
	 * @param {MaterialMapLiveAssetDataContext} context
	 * @param {import("../../../../src/rendering/MaterialMapType.js").MaterialMapType} liveAssetMaterialMapType The material map live asset that needs to be stored on disk.
	 * @returns {Promise<any>} The data to be stored in the Material.
	 */
	static async saveLiveAssetData(context, liveAssetMaterialMapType) {
		throw new Error(`"${this.name}" hasn't implemented saveLiveAssetData().`);
	}

	/**
	 * This should yield ProjectAssets that are linked in the custom data.
	 * This will be used to replace material instances in the editor whenever a
	 * linked live asset changes (a shader for example).
	 * @param {import("../../Editor.js").Editor} editorInstance
	 * @param {import("../AssetManager.js").AssetManager} assetManager
	 * @param {*} customData The customData as stored on disk.
	 * @returns {AsyncGenerator<import("../ProjectAsset.js").ProjectAssetAny?>}
	 */
	static async *getLinkedAssetsInCustomData(editorInstance, assetManager, customData) {}

	/* ==== AssetBundle related methods ==== */

	/**
	 * This gets called when a material needs to get bundled.
	 * By default this turns the result of {@link mapDataToAssetBundleData} into
	 * an ArrayBuffer using {@link objectToBinary}. But you can
	 * override this and return your custom ArrayBuffer.
	 * @param {import("../../Editor.js").Editor} editorInstance
	 * @param {import("../AssetManager.js").AssetManager} assetManager
	 * @param {*} customData The customData as stored on disk.
	 * @returns {ArrayBuffer?} The binary data to be stored in the material asset.
	 */
	static mapDataToAssetBundleBinary(editorInstance, assetManager, customData) {
		const bundleMapData = this.mapDataToAssetBundleData(customData);
		if (!bundleMapData) {
			// fail silently, you probaly intended to not export anything
			return null;
		}

		if (!this.assetBundleBinarySerializationOpts) {
			console.warn("Failed to export material map, assetBundleBinarySerializationOpts is not set");
			return null;
		}
		return objectToBinary(bundleMapData, {
			...this.assetBundleBinarySerializationOpts,
			editorAssetManager: assetManager,
		});
	}

	/**
	 * This gets called when a material needs to get bundled.
	 * You can use this to make some final modifications to the customData
	 * before it gets passed on to {@link mapDataToAssetBundleBinary}.
	 * Usually it is ok to leave this as is.
	 * @param {Object} customData The customData as stored on disk.
	 * @returns {any} The modified customData.
	 */
	static mapDataToAssetBundleData(customData) {
		return customData;
	}

	/**
	 * If you don't override {@link mapDataToAssetBundleBinary} or {@link mapDataToAssetBundleData},
	 * these are the default options for {@link objectToBinary}.
	 * If you want support for exporting your custom data in assetbundles, you
	 * should provide a structure here.
	 * @type {import("../../../../src/util/binarySerialization.js").ObjectToBinaryOptions<any>?}
	 */
	static assetBundleBinarySerializationOpts = null;

	/* ==== Misc ==== */

	// todo: I don't know why this is here. It seems awfully similar to
	// getLinkedAssetsInCustomData. I think we can combine them.
	/**
	 * @param {any} mapData
	 */
	static *getReferencedAssetUuids(mapData) {
		const bundleMapData = this.mapDataToAssetBundleData(mapData);
		if (!bundleMapData) {
			// fail silently, you probaly intended to not export anything
			return;
		}
		if (bundleMapData instanceof ArrayBuffer) return;

		const binarySerializationOpts = this.assetBundleBinarySerializationOpts;
		if (!binarySerializationOpts) {
			console.warn("Failed to find referenced asset uuids, assetBundleBinarySerializationOpts is not set");
			return;
		}
		/** @type {import("../../../../src/mod.js").UuidString[]} */
		const referencedUuids = [];
		objectToBinary(bundleMapData, {
			...binarySerializationOpts,
			transformValueHook: args => {
				let {value, type} = args;
				if (binarySerializationOpts.transformValueHook) {
					value = binarySerializationOpts.transformValueHook(args);
				}

				if (type == StorageType.ASSET_UUID) {
					const castValue = /** @type {import("../../../../src/mod.js").UuidString} */ (value);
					referencedUuids.push(castValue);
				}
				return value;
			},
		});
		for (const uuid of referencedUuids) {
			yield uuid;
		}
	}

	/**
	 * @param {MaterialMapLiveAssetDataContext} context
	 * @param {*} customData
	 * @param {import("../MaterialMapTypeSerializerManager.js").MaterialMapMappedValuesAssetData} mappedValuesData
	 */
	static async getMappedValues(context, customData, mappedValuesData) {
		/** @type {MaterialMapTypeMappableValue[]} */
		const mappedValues = [];
		const mappableValues = await this.getMappableValues(context, customData);
		for (const {name, type, defaultValue} of mappableValues) {
			const mappedValueData = mappedValuesData?.[name];
			if (mappedValueData?.visible ?? true) {
				mappedValues.push({
					name: mappedValueData?.mappedName ?? name,
					defaultValue: mappedValueData?.defaultValue ?? defaultValue,
					type,
				});
			}
		}
		return mappedValues;
	}
}
