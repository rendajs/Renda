import Vec2 from "../Math/Vec2.js";
import Vec3 from "../Math/Vec3.js";
import Vec4 from "../Math/Vec4.js";
import Mat4 from "../Math/Mat4.js";
import {DEFAULT_ASSET_LINKS_IN_ENTITY_JSON_EXPORT, EDITOR_DEFAULTS_IN_COMPONENTS} from "../engineDefines.js";

const settingDefaultsPromisesSym = Symbol("settingDefaultsPromises");
const onEditorDefaultsCbsSym = Symbol("onEditorDefaultsCbs");
const editorDefaultsHandledSym = Symbol("editorDefaultsHandled");

/**
 * @typedef {Object} ComponentTypeData
 * @property {string} uuid
 * @property {string} name
 * @property {import("../../editor/src/UI/PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewStructure} properties
 * @property {import("../Util/BinaryComposer.js").BinaryComposerObjectToBinaryOptions} binaryComposerOpts
 */

/**
 * @typedef {Object} ComponentEditorOptions
 * @property {import("../../editor/src/Assets/ProjectAssetTypeManager.js").default} editorAssetTypeManager
 * @property {symbol} usedAssetUuidsSymbol
 * @property {import("../../editor/src/Assets/AssetManager.js").default} assetManager
 */

/**
 * @typedef {Object} ComponentInitOptions
 * @property {ComponentEditorOptions} [editorOpts]
 */

/**
 * @typedef {[ComponentInitOptions?]} ComponentConstructorRestArgs
 */

/**
 * @unrestricted (Allow adding custom properties to this class)
 */
export class Component {
	static get componentName() {
		return null;
	}
	static get uuid() {
		return null;
	}
	/**
	 * @returns {import("../../editor/src/UI/PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewStructure}
	 */
	static get guiStructure() {
		return null;
	}
	/**
	 * @returns {import("../Util/BinaryComposer.js").BinaryComposerObjectToBinaryOptions}
	 */
	static get binaryComposerOpts() {
		return null;
	}

	/**
	 * @param {Parameters<Component["initValues"]>} args
	 */
	constructor(...args) {
		/** @type {import("../Core/Entity.js").default} */
		this.entity = null;

		if (EDITOR_DEFAULTS_IN_COMPONENTS) {
			this[editorDefaultsHandledSym] = false;
			this[settingDefaultsPromisesSym] = [];
			this[onEditorDefaultsCbsSym] = new Set();
		}
	}

	/**
	 * Call this from the constructor of the extending class after setting your own default values.
	 * @param {Object.<string, *>} propertyValues
	 * @param {ComponentInitOptions} options
	 */
	initValues(propertyValues = {}, {
		editorOpts = null,
	} = {}) {
		const castConstructor = /** @type {typeof Component} */ (this.constructor);
		const structure = castConstructor.guiStructure;
		if (structure) {
			this._setDefaultValues(castConstructor.guiStructure, editorOpts);
		}

		if (!EDITOR_DEFAULTS_IN_COMPONENTS) {
			this._applyPropertyValues(propertyValues);
		} else {
			this._handleDefaultEditorValues(propertyValues);
		}
	}

	_applyPropertyValues(propertyValues) {
		for (const [propertyName, propertyValue] of Object.entries(propertyValues)) {
			this[propertyName] = propertyValue;
		}
	}

	async _handleDefaultEditorValues(propertyValues) {
		if (!EDITOR_DEFAULTS_IN_COMPONENTS) return;
		await Promise.all(this[settingDefaultsPromisesSym]);
		this._applyPropertyValues(propertyValues);

		this[editorDefaultsHandledSym] = true;
		this[onEditorDefaultsCbsSym].forEach(cb => cb());
		delete this[settingDefaultsPromisesSym];
		delete this[onEditorDefaultsCbsSym];
	}

	destructor() {
		this.entity = null;
	}

	toJson(editorOpts = null) {
		const propertyValues = {};
		const castConstructor = /** @type {typeof Component} */ (this.constructor);
		const structure = castConstructor.guiStructure;
		if (structure) {
			for (const propertyName of Object.keys(structure)) {
				propertyValues[propertyName] = this.propertyToJson(this, propertyName, editorOpts);
			}
		}
		const componentJson = {
			uuid: castConstructor.uuid,
			propertyValues,
		};
		return componentJson;
	}

	propertyToJson(object, propertyName, editorOpts) {
		const propertyValue = object[propertyName];
		if (Array.isArray(propertyValue)) {
			const mappedArray = [];
			for (const i of propertyValue.keys()) {
				mappedArray[i] = this.propertyToJson(propertyValue, i, editorOpts);
			}
			return mappedArray;
		}

		// todo, use a global list of math types
		if (propertyValue instanceof Vec2 || propertyValue instanceof Vec3 || propertyValue instanceof Vec4) {
			return propertyValue.toArray();
		} else if (propertyValue instanceof Mat4) {
			return propertyValue.getFlatArray();
		}

		if (DEFAULT_ASSET_LINKS_IN_ENTITY_JSON_EXPORT && propertyValue && editorOpts && editorOpts.usedAssetUuidsSymbol && editorOpts.assetManager && editorOpts.assetTypeManager && editorOpts.assetTypeManager.constructorHasAssetType(propertyValue.constructor)) {
			const usedAssetUuids = object[editorOpts.usedAssetUuidsSymbol];
			if (usedAssetUuids) {
				const assetUuid = usedAssetUuids[propertyName];
				if (assetUuid) return assetUuid;
			}

			const projectAsset = editorOpts.assetManager.getProjectAssetForLiveAsset(propertyValue);
			if (projectAsset) {
				return projectAsset.uuid;
			} else {
				return null;
			}
		}

		return propertyValue;
	}

	_setDefaultValues(properties, editorOpts = null) {
		for (const [propertyName, propertyData] of Object.entries(properties)) {
			this.setPropertyDefaultValue(this, propertyName, propertyData, editorOpts);
		}
	}

	/**
	 * @param {*} object
	 * @param {string} propertyName
	 * @param {import("../../editor/src/UI/PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewEntryOptions} propertyData
	 * @param {*} editorOpts
	 */
	setPropertyDefaultValue(object, propertyName, propertyData, editorOpts = null) {
		let defaultValue;
		if (propertyData && propertyData.guiOpts) {
			defaultValue = propertyData.guiOpts.defaultValue;
		}
		if (propertyData.type == "array") {
			const array = [];
			if (defaultValue) {
				const arrayGuiOptions = /** @type {import("../../editor/src/UI/ArrayGui.js").ArrayGuiOptions} */ (propertyData.guiOpts);
				for (const [i, value] of Object.entries(defaultValue)) {
					/** @type {import("../../editor/src/UI/PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewEntryOptions} */
					const childPropertyData = {
						type: arrayGuiOptions.arrayType,
						guiOpts: {
							...arrayGuiOptions.arrayGuiOpts,
							defaultValue: value,
						},
					};
					if (DEFAULT_ASSET_LINKS_IN_ENTITY_JSON_EXPORT) {
						this.setPropertyDefaultValue(array, i, childPropertyData, editorOpts);
					} else {
						this.setPropertyDefaultValue(array, i, childPropertyData);
					}
				}
			}
			object[propertyName] = array;
		} else if (defaultValue != undefined) {
			let resolveDroppableAsset = false;
			if (
				typeof defaultValue == "string" &&
				propertyData.type == "droppable" &&
				DEFAULT_ASSET_LINKS_IN_ENTITY_JSON_EXPORT &&
				editorOpts && editorOpts.editorAssetTypeManager &&
				editorOpts.usedAssetUuidsSymbol &&
				editorOpts.assetManager
			) {
				const droppableGuiOptions = /** @type {import("../../editor/src/UI/DroppableGui.js").DroppableGuiOptions} */ (propertyData.guiOpts);
				for (const assetType of droppableGuiOptions.supportedAssetTypes) {
					if (editorOpts.editorAssetTypeManager.constructorHasAssetType(assetType)) {
						resolveDroppableAsset = true;
						break;
					}
				}
			}

			if (resolveDroppableAsset) {
				let usedAssetUuids = object[editorOpts.usedAssetUuidsSymbol];
				if (!usedAssetUuids) {
					usedAssetUuids = {};
					object[editorOpts.usedAssetUuidsSymbol] = usedAssetUuids;
				}
				usedAssetUuids[propertyName] = defaultValue;
				const promise = (async () => {
					object[propertyName] = null;
					object[propertyName] = await editorOpts.assetManager.getLiveAsset(defaultValue);
				})();
				if (EDITOR_DEFAULTS_IN_COMPONENTS) {
					this[settingDefaultsPromisesSym].push(promise);
				}
			} else {
				object[propertyName] = defaultValue;
			}
		} else if (propertyData.type == "dropdown") {
			object[propertyName] = propertyData.type[0];
		} else if (propertyData.type == "vec3") { // todo, use a global list of math types
			object[propertyName] = new Vec3();
		} else {
			// Leave the property as it is, it's default value is being set in the constructor.
		}
	}

	async waitForEditorDefaults() {
		if (!EDITOR_DEFAULTS_IN_COMPONENTS) return;
		if (this[editorDefaultsHandledSym]) return;
		await new Promise(r => this[onEditorDefaultsCbsSym].add(r));
	}
}
