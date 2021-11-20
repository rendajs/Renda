import BinaryComposer, {StorageType} from "../../../src/Util/BinaryComposer.js";
import editor from "../editorInstance.js";
import {MaterialMapListUi} from "./MaterialMapListUi.js";

/**
 * @fileoverview Instances of MaterialMapType take care of rendering ui in the
 * properties window for a MaterialMap. Registering it causes an extra entry to
 * be added to the 'Add Map Type' button.
 *
 * There are also a few static methods related to mappable values. These take
 * care of showing ui for materials.
 */

export class MaterialMapType {
	/* ==== Material Map UI related methods ==== */

	/**
	 * Name that will be shown in the editor ui.
	 * @type {string}
	 */
	static uiName = null;

	/**
	 * This will be used for storing the map type in the MaterialMap asset.
	 * You can generate a uuid in the editor browser console using `Util.generateUuid()`.
	 * @type {import("../Util/Util.js").UuidString}
	 */
	static typeUuid = null;

	/**
	 * If you set this to true you should at least implement {@link mapDataToAssetBundleBinary}
	 * or set a structure in {@link assetBundleBinaryComposerOpts}.
	 */
	static allowExportInAssetBundles = false;

	/**
	 * @param {import("../UI/PropertiesTreeView/PropertiesTreeView.js").PropertiesTreeView} treeView
	 */
	constructor(treeView) {
		this.treeView = treeView;
		this.settingsTreeView = this.treeView.addCollapsable("Map Settings");
		this.onValueChangeCbs = new Set();
		this.mapListTreeView = this.treeView.addCollapsable("Map List");
		this.mapListUi = null;
		this.lastSavedCustomData = null;
		this.lastSavedCustomDataDirty = true;
	}

	/**
	 * Overide this with your logic to load saved data in your MaterialMap ui.
	 * @param {*} customData
	 */
	async customAssetDataFromLoad(customData) {}

	/**
	 * Override this and return the data you want to save.
	 * This gets called when a MaterialMap is going to be saved.
	 * @returns {Promise<?Object>}
	 */
	async getCustomAssetDataForSave() {}

	// fire this whenever a user changes something that
	// requires the custom data to be saved
	signalCustomDataChanged() {
		this.lastSavedCustomDataDirty = true;
		this.valueChanged();
	}

	/**
	 * @typedef {Object} MappableValue
	 * @property {string} name
	 * @property {number | import("../../../src/Math/Vec2.js").default | import("../../../src/Math/Vec3.js").default | import("../../../src/Math/Vec4.js").default | import("../../../src/Math/Mat4.js").default} type
	 * @property {*} [defaultValue]
	 */

	/**
	 * This will be used to render the mapping ui in MaterialMaps, as well as
	 * the values ui in Materials. The values of materials will be automatically
	 * loaded, saved and exported in assetbundles.
	 * `customData` will be whatever you last returned from
	 * {@link getCustomAssetDataForSave}.
	 * @param {*} customData The customData as stored on disk.
	 * @returns {Promise<MappableValue[]>}
	 */
	static async getMappableValues(customData) {
		return [];
	}

	/* ==== Material instance related methods ==== */

	/**
	 * Use this to convert customData as stored on disk to data that lives
	 * in Material instances.
	 * For instance, assets are stored on disk as uuid. Use this to load the
	 * assets and store them in the Material.
	 * @param {*} customData The customData as stored on disk.
	 * @returns {Promise<Object>} The data to be stored in the Material.
	 */
	static async getLiveAssetCustomData(customData) {
		return {};
	}

	/**
	 * This should yield ProjectAssets that are linked in the custom data.
	 * This will be used to replace material instances in the editor whenever a
	 * linked live asset changes (a shader for example).
	 * @param {*} customData The customData as stored on disk.
	 * @returns {AsyncGenerator<import("../Assets/ProjectAsset.js").default>}
	 */
	static async *getLinkedAssetsInCustomData(customData) {}

	/* ==== AssetBundle related methods ==== */

	/**
	 * This gets called when a material needs to get bundled.
	 * By default this turns the result of {@link mapDataToAssetBundleData} into
	 * an ArrayBuffer using {@link BinaryComposer.objectToBinary}. But you can
	 * override this and return your custom ArrayBuffer.
	 * @param {*} customData The customData as stored on disk.
	 * @returns {ArrayBuffer} The binary data to be stored in the material asset.
	 */
	static mapDataToAssetBundleBinary(customData) {
		const bundleMapData = this.mapDataToAssetBundleData(customData);
		if (!bundleMapData) {
			// fail silently, you probaly intended to not export anything
			return null;
		}

		if (!this.assetBundleBinaryComposerOpts) {
			console.warn("Failed to export material map, assetBundleBinaryComposerOpts is not set");
			return null;
		}
		return BinaryComposer.objectToBinary(bundleMapData, {
			...this.assetBundleBinaryComposerOpts,
			editorAssetManager: editor.projectManager.assetManager,
		});
	}

	/**
	 * This gets called when a material needs to get bundled.
	 * You can use this to make some final modifications to the customData
	 * before it gets passed on to {@link mapDataToAssetBundleBinary}.
	 * Usually it is ok to leave this as is.
	 * @param {Object} customData The customData as stored on disk.
	 * @returns {?Object} The modified customData.
	 */
	static mapDataToAssetBundleData(customData) {
		return customData;
	}

	/**
	 * If you don't override {@link mapDataToAssetBundleBinary} or {@link mapDataToAssetBundleData},
	 * these are the default options for {@link BinaryComposer.objectToBinary}.
	 * If you want support for exporting your custom data in assetbundles, you
	 * should provide a structure here.
	 * @type {import("../../../src/Util/BinaryComposer.js").BinaryComposerObjectToBinaryOptions}
	 */
	static assetBundleBinaryComposerOpts = null;

	/* ==== Misc ==== */

	// todo: I don't know why this is here. It seems awfully similar to
	// getLinkedAssetsInCustomData. I think we can combine them.
	static *getReferencedAssetUuids(mapData) {
		const bundleMapData = this.mapDataToAssetBundleData(mapData);
		if (!bundleMapData) {
			// fail silently, you probaly intended to not export anything
			return;
		}
		if (bundleMapData instanceof ArrayBuffer) return;

		if (!this.assetBundleBinaryComposerOpts) {
			console.warn("Failed to find referenced asset uuids, assetBundleBinaryComposerOpts is not set");
			return;
		}
		const referencedUuids = [];
		BinaryComposer.objectToBinary(bundleMapData, {
			...this.assetBundleBinaryComposerOpts,
			transformValueHook: args => {
				let {value, type} = args;
				if (this.assetBundleBinaryComposerOpts.transformValueHook) {
					value = this.assetBundleBinaryComposerOpts.transformValueHook(args);
				}

				if (type == StorageType.ASSET_UUID) {
					referencedUuids.push(value);
				}
				return value;
			},
		});
		for (const uuid of referencedUuids) {
			yield uuid;
		}
	}

	onValueChange(cb) {
		this.onValueChangeCbs.add(cb);
	}

	valueChanged() {
		for (const cb of this.onValueChangeCbs) {
			cb();
		}
	}

	async getCustomAssetDataForSaveInternal() {
		if (this.lastSavedCustomDataDirty) {
			const customData = await this.getCustomAssetDataForSave();
			this.lastSavedCustomData = customData;
			this.lastSavedCustomDataDirty = false;
		}
		return this.lastSavedCustomData;
	}

	async updateMapListUi() {
		if (this.mapListUi) {
			this.mapListUi.destructor();
			this.mapListUi = null;
		}

		const constr = /** @type {typeof MaterialMapType} */ (this.constructor);
		this.mapListUi = new MaterialMapListUi({
			items: await constr.getMappableValues(await this.getCustomAssetDataForSaveInternal()),
		});
		this.mapListTreeView.addChild(this.mapListUi.treeView);
		this.mapListUi.onValueChange(() => {
			this.valueChanged();
		});
	}

	async getMappableValuesForSave() {
		return this.mapListUi?.getValues();
	}

	fillMapListValues(values) {
		if (!this.mapListUi) return;
		this.mapListUi.setValues(values);
	}

	static async getMappedValues(customData, mappedValuesData) {
		const mappedValues = [];
		const mappableValues = await this.getMappableValues(customData);
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

	static invalidConfigurationWarning(message) {
		console.warn(message + "\nView MaterialMapType.js for more info.");
	}
}
