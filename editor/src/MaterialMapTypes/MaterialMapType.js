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

	// overide this with your logic to load saved data in your ui
	async customAssetDataFromLoad(data) {}

	/**
	 * Override this and return the data you want to save.
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
	 * Use this to convert customData to something that is more easily usable.
	 * For instance load assets from their id.
	 * @param {*} customData
	 * @returns {Promise<Object>}
	 */
	static async getLiveAssetCustomData(customData) {
		return {};
	}

	/**
	 * This should yield ProjectAssets that are linked in the custom data.
	 * This will be used to replace material instances in the editor whenever a
	 * linked live asset changes (a shader for example).
	 * @param {*} customData
	 * @returns {AsyncGenerator<import("../Assets/ProjectAsset.js").default>}
	 */
	static async *getLinkedAssetsInCustomData(customData) {}

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
	 * @param {*} customData
	 * @returns {Promise<MappableValue[]>}
	 */
	static async getMappableValues(customData) {
		return [];
	}

	// Override the 3 items below if you want to be able to export mapData in assetbundles.
	// usually returning the mapData object itself in mapDataToAssetBundleData() is enough,
	// unless you want to transform some values first.
	// mapDataToAssetBundleData() can return an arraybuffer.
	// you can also return an object if assetBundleBinaryComposerOpts is set,
	// the values will be converted to binary using BinaryComposer.objectToBinary()

	static assetBundleBinaryComposerOpts = null;

	/**
	 * @param {Object} mapData
	 * @returns {?Object}
	 */
	static mapDataToAssetBundleData(mapData) {
		return null;
	}

	// alternatively you can override this for more control
	static mapDataToAssetBundleBinary(mapData) {
		const bundleMapData = this.mapDataToAssetBundleData(mapData);
		if (!bundleMapData) {
			// fail silently, you probaly intended to not export anything
			return null;
		}
		if (bundleMapData instanceof ArrayBuffer) return bundleMapData;

		if (!this.assetBundleBinaryComposerOpts) {
			console.warn("Failed to export material map, assetBundleBinaryComposerOpts is not set");
			return null;
		}
		return BinaryComposer.objectToBinary(bundleMapData, {
			...this.assetBundleBinaryComposerOpts,
			editorAssetManager: editor.projectManager.assetManager,
		});
	}

	// alternatively you can override this for more control
	// this will be used for determining what other assets should be included in a bundle recursively
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
