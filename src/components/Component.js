import { Vec2 } from "../math/Vec2.js";
import { Vec3 } from "../math/Vec3.js";
import { Vec4 } from "../math/Vec4.js";
import { Mat4 } from "../math/Mat4.js";
import { DEFAULT_ASSET_LINKS_IN_ENTITY_JSON_EXPORT, STUDIO_DEFAULTS_IN_COMPONENTS } from "../studioDefines.js";
import { mathTypeToJson } from "../math/MathTypes.js";

const settingDefaultsPromisesSym = Symbol("settingDefaultsPromises");
const onStudioDefaultsCbsSym = Symbol("onStudioDefaultsCbs");
const studioDefaultsHandledSym = Symbol("studioDefaultsHandled");

/**
 * @typedef {new (...args: any) => Component} ComponentConstructor
 */

/**
 * @typedef {object} ComponentStudioOptions
 * @property {import("../../studio/src/assets/ProjectAssetTypeManager.js").ProjectAssetTypeManager} studioAssetTypeManager
 * @property {symbol} usedAssetUuidsSymbol
 * @property {import("../../studio/src/assets/AssetManager.js").AssetManager} assetManager
 */

/**
 * @typedef {object} ComponentInitOptions
 * @property {ComponentStudioOptions?} [studioOpts]
 */

/**
 * @typedef {[ComponentInitOptions?]} ComponentConstructorRestArgs
 */

/**
 * @typedef {object} EntityJsonDataComponent
 * @property {import("../util/util.js").UuidString} uuid
 * @property {Object<string, any>} propertyValues
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
	 * @returns {import("../../studio/src/ui/propertiesTreeView/types.ts").PropertiesTreeViewStructure?}
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
	 * [studioDefaultsHandledSym]? : boolean
	 * [settingDefaultsPromisesSym]? : Promise<void>[]
	 * [onStudioDefaultsCbsSym]? : Set<(...args: any) => void>
	 * }} ComponentWithSyms
	 */

	/**
	 * @param {Parameters<Component["initValues"]>} args
	 */
	constructor(...args) {
		/** @type {import("../core/Entity.js").Entity?} */
		this.entity = null;

		if (STUDIO_DEFAULTS_IN_COMPONENTS) {
			const castComponent = /** @type {ComponentWithSyms} */ (this);
			castComponent[studioDefaultsHandledSym] = false;
		}
	}

	/**
	 * Call this from the constructor of the extending class after setting your own default values.
	 * @param {Object<string, unknown>} propertyValues
	 * @param {ComponentInitOptions} options
	 */
	initValues(propertyValues = {}, {
		studioOpts = null,
	} = {}) {
		const castConstructor = /** @type {typeof Component} */ (this.constructor);
		const structure = castConstructor.guiStructure;
		if (structure) {
			this._setDefaultValues(castConstructor.guiStructure, studioOpts);
		}

		if (!STUDIO_DEFAULTS_IN_COMPONENTS) {
			this._applyPropertyValues(propertyValues);
		} else {
			this._handleDefaultStudioValues(propertyValues);
		}
	}

	/**
	 * @param {Object<string, unknown>} propertyValues
	 */
	_applyPropertyValues(propertyValues) {
		for (const [propertyName, propertyValue] of Object.entries(propertyValues)) {
			const castComponentA = /** @type {unknown} */ (this);
			const castComponentB = /** @type {Object<string, unknown>} */ (castComponentA);
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
	 * @param {Object<string, unknown>} propertyValues
	 */
	async _handleDefaultStudioValues(propertyValues) {
		if (!STUDIO_DEFAULTS_IN_COMPONENTS) return;
		const castComponent = /** @type {ComponentWithSyms} */ (this);
		const promises = castComponent[settingDefaultsPromisesSym];
		if (promises) {
			await Promise.all(promises);
		}
		this._applyPropertyValues(propertyValues);

		castComponent[studioDefaultsHandledSym] = true;
		const cbs = castComponent[onStudioDefaultsCbsSym];
		if (cbs) {
			cbs.forEach(cb => cb());
		}
		delete castComponent[settingDefaultsPromisesSym];
		delete castComponent[onStudioDefaultsCbsSym];
	}

	destructor() {
		this.entity = null;
	}

	/**
	 * @param {import("../core/Entity.js").EntityToJsonOptions?} studioOpts
	 */
	toJson(studioOpts = null) {
		/** @type {Object<string, unknown>} */
		const propertyValues = {};
		const castConstructor = /** @type {typeof Component} */ (this.constructor);
		const structure = castConstructor.guiStructure;
		if (structure) {
			const castComponentA = /** @type {unknown} */ (this);
			const castComponentB = /** @type {Object<string, unknown>} */ (castComponentA);
			for (const propertyName of Object.keys(structure)) {
				propertyValues[propertyName] = this.propertyToJson(castComponentB, propertyName, studioOpts);
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
	 * @param {Object<string | number, unknown>} object
	 * @param {string | number} propertyName
	 * @param {import("../core/Entity.js").EntityToJsonOptions?} studioOpts
	 * @returns {unknown}
	 */
	propertyToJson(object, propertyName, studioOpts) {
		const propertyValue = object[propertyName];
		if (Array.isArray(propertyValue)) {
			const castPropertyValue = /** @type {unknown[]} */ (propertyValue);
			/** @type {unknown[]} */
			const mappedArray = [];
			for (const i of castPropertyValue.keys()) {
				mappedArray[i] = this.propertyToJson(castPropertyValue, i, studioOpts);
			}
			return mappedArray;
		}

		const replacedMathType = mathTypeToJson(propertyValue);
		if (replacedMathType) {
			return replacedMathType;
		}

		if (DEFAULT_ASSET_LINKS_IN_ENTITY_JSON_EXPORT && propertyValue && studioOpts && studioOpts.usedAssetUuidsSymbol && studioOpts.assetManager && studioOpts.assetTypeManager && studioOpts.assetTypeManager.constructorHasAssetType(propertyValue.constructor)) {
			const usedAssetUuids = object[studioOpts.usedAssetUuidsSymbol];
			if (usedAssetUuids) {
				const assetUuid = usedAssetUuids[propertyName];
				if (assetUuid) return assetUuid;
			}

			const projectAsset = studioOpts.assetManager.getProjectAssetForLiveAsset(propertyValue);
			if (projectAsset) {
				return projectAsset.uuid;
			} else {
				return null;
			}
		}

		return propertyValue;
	}

	/**
	 * Creates a new instance of the component and copies the properties from
	 * this component to it. The values themselves (e.g. linked assets) are not copied.
	 * Only properties that are defined in the component's `guiStructure` are copied.
	 */
	clone() {
		const CastConstructor = /** @type {typeof Component} */ (this.constructor);
		const clone = new CastConstructor();
		const structure = CastConstructor.guiStructure;
		if (structure) {
			const castClone1 = /** @type {unknown} */ (clone);
			const castClone2 = /** @type {Object<string, unknown>} */ (castClone1);
			for (const propertyName of Object.keys(structure)) {
				castClone2[propertyName] = this._cloneProperty(propertyName);
			}
		}
		return clone;
	}

	/**
	 * @private
	 * @param {string} propertyName
	 */
	_cloneProperty(propertyName) {
		const castComponent1 = /** @type {unknown} */ (this);
		const castComponent2 = /** @type {Object<string, unknown>} */ (castComponent1);
		const propertyValue = castComponent2[propertyName];

		// TODO: handle arrays and objects

		return propertyValue;
	}

	/**
	 * @param {import("../../studio/src/ui/propertiesTreeView/types.ts").PropertiesTreeViewStructure} properties
	 * @param {ComponentStudioOptions?} studioOpts
	 */
	_setDefaultValues(properties, studioOpts = null) {
		for (const [propertyName, propertyData] of Object.entries(properties)) {
			this.setPropertyDefaultValue(this, propertyName, propertyData, studioOpts);
		}
	}

	/**
	 * @param {Object<string | number, unknown>} object
	 * @param {string} propertyName
	 * @param {import("../../studio/src/ui/propertiesTreeView/types.ts").PropertiesTreeViewEntryOptions} propertyData
	 * @param {ComponentStudioOptions?} studioOpts
	 */
	setPropertyDefaultValue(object, propertyName, propertyData, studioOpts = null) {
		let defaultValue;
		if (propertyData && propertyData.guiOpts) {
			defaultValue = propertyData.guiOpts.defaultValue;
		}
		if (propertyData.type == "array") {
			/** @type {unknown[]} */
			const array = [];
			if (defaultValue) {
				const arrayGuiOptions = /** @type {import("../../studio/src/ui/ArrayGui.js").ArrayGuiOptions<any>} */ (propertyData.guiOpts);
				for (const [i, value] of Object.entries(defaultValue)) {
					/** @type {import("../../studio/src/ui/propertiesTreeView/types.ts").PropertiesTreeViewEntryOptions} */
					const childPropertyData = {
						type: arrayGuiOptions.arrayType,
						guiOpts: {
							...arrayGuiOptions.arrayGuiOpts,
							defaultValue: value,
						},
					};
					if (DEFAULT_ASSET_LINKS_IN_ENTITY_JSON_EXPORT) {
						this.setPropertyDefaultValue(array, i, childPropertyData, studioOpts);
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
				studioOpts && studioOpts.studioAssetTypeManager &&
				studioOpts.usedAssetUuidsSymbol &&
				studioOpts.assetManager
			) {
				const droppableGuiOptions = /** @type {import("../../studio/src/ui/DroppableGui.js").DroppableGuiOptions<(new (...args: any) => unknown)>} */ (propertyData.guiOpts);
				if (droppableGuiOptions.supportedAssetTypes) {
					for (const assetType of droppableGuiOptions.supportedAssetTypes) {
						if (studioOpts.studioAssetTypeManager.constructorHasAssetType(assetType)) {
							resolveDroppableAsset = true;
							break;
						}
					}
				}
			}

			if (resolveDroppableAsset) {
				if (STUDIO_DEFAULTS_IN_COMPONENTS && studioOpts) {
					let usedAssetUuids = object[studioOpts.usedAssetUuidsSymbol];
					if (!usedAssetUuids) {
						usedAssetUuids = {};
						object[studioOpts.usedAssetUuidsSymbol] = usedAssetUuids;
					}
					usedAssetUuids[propertyName] = defaultValue;
					const promise = (async () => {
						object[propertyName] = null;
						object[propertyName] = await studioOpts.assetManager.getLiveAsset(defaultValue);
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
			// Leave the property as it is, it's default value has been set in the constructor.
		}
	}

	async waitForStudioDefaults() {
		if (!STUDIO_DEFAULTS_IN_COMPONENTS) return;
		const castComponent = /** @type {ComponentWithSyms} */ (this);
		if (castComponent[studioDefaultsHandledSym]) return;
		let cbs = castComponent[onStudioDefaultsCbsSym];
		if (!cbs) {
			cbs = new Set();
			castComponent[onStudioDefaultsCbsSym] = cbs;
		}
		const certainCbs = cbs;
		await new Promise(r => certainCbs.add(r));
	}
}
