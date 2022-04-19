import {Vec2} from "../math/Vec2.js";
import {Vec3} from "../math/Vec3.js";
import {Vec4} from "../math/Vec4.js";
import {Mat4} from "../math/Mat4.js";
import {DEFAULT_ASSET_LINKS_IN_ENTITY_JSON_EXPORT, EDITOR_DEFAULTS_IN_COMPONENTS} from "../engineDefines.js";
import {mathTypeToJson} from "../math/MathTypes.js";

const settingDefaultsPromisesSym = Symbol("settingDefaultsPromises");
const onEditorDefaultsCbsSym = Symbol("onEditorDefaultsCbs");
const editorDefaultsHandledSym = Symbol("editorDefaultsHandled");

/**
 * @typedef {new (...args: any) => Component} ComponentConstructor
 */

/**
 * @typedef {Object} ComponentEditorOptions
 * @property {import("../../editor/src/assets/ProjectAssetTypeManager.js").ProjectAssetTypeManager} editorAssetTypeManager
 * @property {symbol} usedAssetUuidsSymbol
 * @property {import("../../editor/src/assets/AssetManager.js").AssetManager} assetManager
 */

/**
 * @typedef {Object} ComponentInitOptions
 * @property {ComponentEditorOptions?} [editorOpts]
 */

/**
 * @typedef {[ComponentInitOptions?]} ComponentConstructorRestArgs
 */

/**
 * @typedef {Object} EntityJsonDataComponent
 * @property {import("../util/util.js").UuidString} uuid
 * @property {Object.<string, any>} propertyValues
 */

/**
 * @unrestricted (Allow adding custom properties to this class)
 */
export class Component {
	/**
	 * @returns {string?}
	 */
	static get componentName() {
		return null;
	}

	/**
	 * @returns {import("../util/util.js").UuidString?}
	 */
	static get uuid() {
		return null;
	}
	/**
	 * @returns {import("../../editor/src/ui/propertiesTreeView/types.js").PropertiesTreeViewStructure?}
	 */
	static get guiStructure() {
		return null;
	}
	/**
	 * @returns {import("../util/binarySerialization.js").ObjectToBinaryOptions<any>?}
	 */
	static get binarySerializationOpts() {
		return null;
	}

	/**
	 * @typedef {Component & {
	 * [editorDefaultsHandledSym]? : boolean
	 * [settingDefaultsPromisesSym]? : Promise<void>[]
	 * [onEditorDefaultsCbsSym]? : Set<(...args: any) => void>
	 * }} ComponentWithSyms
	 */

	/**
	 * @param {Parameters<Component["initValues"]>} args
	 */
	constructor(...args) {
		/** @type {import("../core/Entity.js").Entity?} */
		this.entity = null;

		if (EDITOR_DEFAULTS_IN_COMPONENTS) {
			const castComponent = /** @type {ComponentWithSyms} */ (this);
			castComponent[editorDefaultsHandledSym] = false;
		}
	}

	/**
	 * Call this from the constructor of the extending class after setting your own default values.
	 * @param {Object.<string, unknown>} propertyValues
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

	/**
	 * @param {Object.<string, unknown>} propertyValues
	 */
	_applyPropertyValues(propertyValues) {
		for (const [propertyName, propertyValue] of Object.entries(propertyValues)) {
			const castComponentA = /** @type {unknown} */ (this);
			const castComponentB = /** @type {Object.<string, unknown>} */ (castComponentA);
			const existingValue = castComponentB[propertyName];
			if (existingValue instanceof Vec2 && propertyValue instanceof Vec2) {
				existingValue.set(propertyValue);
			} else if (existingValue instanceof Vec3 && propertyValue instanceof Vec3) {
				existingValue.set(propertyValue);
			} else if (existingValue instanceof Vec4 && propertyValue instanceof Vec4) {
				existingValue.set(propertyValue);
			} else if (existingValue instanceof Mat4 && propertyValue instanceof Mat4) {
				existingValue.set(propertyValue);
			} else {
				castComponentB[propertyName] = propertyValue;
			}
		}
	}

	/**
	 * @param {Object.<string, unknown>} propertyValues
	 */
	async _handleDefaultEditorValues(propertyValues) {
		if (!EDITOR_DEFAULTS_IN_COMPONENTS) return;
		const castComponent = /** @type {ComponentWithSyms} */ (this);
		const promises = castComponent[settingDefaultsPromisesSym];
		if (promises) {
			await Promise.all(promises);
		}
		this._applyPropertyValues(propertyValues);

		castComponent[editorDefaultsHandledSym] = true;
		const cbs = castComponent[onEditorDefaultsCbsSym];
		if (cbs) {
			cbs.forEach(cb => cb());
		}
		delete castComponent[settingDefaultsPromisesSym];
		delete castComponent[onEditorDefaultsCbsSym];
	}

	destructor() {
		this.entity = null;
	}

	/**
	 * @param {import("../core/Entity.js").EntityToJsonOptions?} editorOpts
	 */
	toJson(editorOpts = null) {
		/** @type {Object.<string, unknown>} */
		const propertyValues = {};
		const castConstructor = /** @type {typeof Component} */ (this.constructor);
		const structure = castConstructor.guiStructure;
		if (structure) {
			const castComponentA = /** @type {unknown} */ (this);
			const castComponentB = /** @type {Object.<string, unknown>} */ (castComponentA);
			for (const propertyName of Object.keys(structure)) {
				propertyValues[propertyName] = this.propertyToJson(castComponentB, propertyName, editorOpts);
			}
		}
		/** @type {EntityJsonDataComponent} */
		const componentJson = {
			// @ts-expect-error TODO: make uuid not null, use an empty string by default
			uuid: castConstructor.uuid,
			propertyValues,
		};
		return componentJson;
	}

	/**
	 * @param {Object.<string | number, unknown>} object
	 * @param {string | number} propertyName
	 * @param {import("../core/Entity.js").EntityToJsonOptions?} editorOpts
	 * @returns {unknown}
	 */
	propertyToJson(object, propertyName, editorOpts) {
		const propertyValue = object[propertyName];
		if (Array.isArray(propertyValue)) {
			const castPropertyValue = /** @type {unknown[]} */ (propertyValue);
			/** @type {unknown[]} */
			const mappedArray = [];
			for (const i of castPropertyValue.keys()) {
				mappedArray[i] = this.propertyToJson(castPropertyValue, i, editorOpts);
			}
			return mappedArray;
		}

		const replacedMathType = mathTypeToJson(propertyValue);
		if (replacedMathType) {
			return replacedMathType;
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

	/**
	 *
	 * @param {import("../../editor/src/ui/propertiesTreeView/types.js").PropertiesTreeViewStructure} properties
	 * @param {ComponentEditorOptions?} editorOpts
	 */
	_setDefaultValues(properties, editorOpts = null) {
		for (const [propertyName, propertyData] of Object.entries(properties)) {
			this.setPropertyDefaultValue(this, propertyName, propertyData, editorOpts);
		}
	}

	/**
	 * @param {Object.<string | number, unknown>} object
	 * @param {string} propertyName
	 * @param {import("../../editor/src/ui/propertiesTreeView/types.js").PropertiesTreeViewEntryOptions} propertyData
	 * @param {ComponentEditorOptions?} editorOpts
	 */
	setPropertyDefaultValue(object, propertyName, propertyData, editorOpts = null) {
		let defaultValue;
		if (propertyData && propertyData.guiOpts) {
			defaultValue = propertyData.guiOpts.defaultValue;
		}
		if (propertyData.type == "array") {
			/** @type {unknown[]} */
			const array = [];
			if (defaultValue) {
				const arrayGuiOptions = /** @type {import("../../editor/src/ui/ArrayGui.js").ArrayGuiOptions<any>} */ (propertyData.guiOpts);
				for (const [i, value] of Object.entries(defaultValue)) {
					/** @type {import("../../editor/src/ui/propertiesTreeView/types.js").PropertiesTreeViewEntryOptions} */
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
				const droppableGuiOptions = /** @type {import("../../editor/src/ui/DroppableGui.js").DroppableGuiOptions<(new (...args: any) => unknown)>} */ (propertyData.guiOpts);
				if (droppableGuiOptions.supportedAssetTypes) {
					for (const assetType of droppableGuiOptions.supportedAssetTypes) {
						if (editorOpts.editorAssetTypeManager.constructorHasAssetType(assetType)) {
							resolveDroppableAsset = true;
							break;
						}
					}
				}
			}

			if (resolveDroppableAsset) {
				if (EDITOR_DEFAULTS_IN_COMPONENTS && editorOpts) {
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
					const castComponent = /** @type {ComponentWithSyms} */ (this);
					let promises = castComponent[settingDefaultsPromisesSym];
					if (!promises) {
						promises = [];
						castComponent[settingDefaultsPromisesSym] = promises;
					}
					promises.push(promise);
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
		const castComponent = /** @type {ComponentWithSyms} */ (this);
		if (castComponent[editorDefaultsHandledSym]) return;
		let cbs = castComponent[onEditorDefaultsCbsSym];
		if (!cbs) {
			cbs = new Set();
			castComponent[onEditorDefaultsCbsSym] = cbs;
		}
		const certainCbs = cbs;
		await new Promise(r => certainCbs.add(r));
	}
}
