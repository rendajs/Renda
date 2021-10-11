import defaultComponentTypeManager from "./defaultComponentTypeManager.js";
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
 * @property {import("../../editor/src/UI/PropertiesTreeView/PropertiesTreeView.js").PropertiesTreeViewStructure} properties
 * @property {import("../Util/BinaryComposer.js").BinaryComposerObjectToBinaryOptions} binaryComposerOpts
 */

/**
 * @typedef {Object} ComponentEditorOptions
 * @property {import("../../editor/src/Assets/ProjectAssetTypeManager.js").default} editorAssetTypeManager
 * @property {symbol} usedAssetUuidsSymbol
 * @property {import("../../editor/src/Assets/AssetManager.js").default} assetManager
 */

/**
 * @unrestricted (Allow adding custom properties to this class)
 */
export default class Component {
	/**
	 * @param {ComponentTypeData} componentType
	 * @param {Object} propertyValues
	 * @param {Object} options
	 * @param {import("./ComponentTypeManager.js").default} [options.componentTypeManager]
	 * @param {ComponentEditorOptions} [options.editorOpts]
	 */
	constructor(componentType, propertyValues = {}, {
		componentTypeManager = defaultComponentTypeManager,
		editorOpts = null,
	} = {}) {
		this.componentTypeManager = componentTypeManager;

		if (typeof componentType == "string") {
			this.componentUuid = componentType;
		} else {
			const componentData = this.componentTypeManager.getComponentFromData(componentType);
			if (!componentData) {
				throw new Error("Unable to create new component type");
			}
			this.componentUuid = componentData.uuid;
		}
		/** @type {import("../Core/Entity.js").default} */
		this.entity = null;

		if (EDITOR_DEFAULTS_IN_COMPONENTS) {
			this[editorDefaultsHandledSym] = false;
			this[settingDefaultsPromisesSym] = [];
			this[onEditorDefaultsCbsSym] = new Set();
		}

		const componentData = this.getComponentData();
		if (componentData && componentData.properties) {
			this.setDefaultValues(componentData.properties, editorOpts);
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
		const componentData = this.getComponentData();
		if (componentData && componentData.properties) {
			for (const propertyName of Object.keys(componentData.properties)) {
				propertyValues[propertyName] = this.propertyToJson(this, propertyName, editorOpts);
			}
		}
		const componentJson = {
			uuid: this.componentUuid,
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

	getComponentData() {
		return this.componentTypeManager.getComponentDataForUuid(this.componentUuid);
	}

	setDefaultValues(properties, editorOpts = null) {
		for (const [propertyName, propertyData] of Object.entries(properties)) {
			this.setPropertyDefaultValue(this, propertyName, propertyData, editorOpts);
		}
	}

	setPropertyDefaultValue(object, propertyName, propertyData, editorOpts = null) {
		if (propertyData.type == Array) {
			const array = [];
			if (propertyData.defaultValue) {
				for (const [i, value] of Object.entries(propertyData.defaultValue)) {
					const childPropertyData = {
						...propertyData.arrayOpts,
						defaultValue: value,
					};
					if (DEFAULT_ASSET_LINKS_IN_ENTITY_JSON_EXPORT) {
						this.setPropertyDefaultValue(array, i, childPropertyData, editorOpts);
					} else {
						this.setPropertyDefaultValue(array, i, childPropertyData);
					}
				}
			}
			object[propertyName] = array;
		} else if (propertyData.defaultValue != undefined) {
			if (typeof propertyData.defaultValue == "string" && DEFAULT_ASSET_LINKS_IN_ENTITY_JSON_EXPORT && editorOpts && editorOpts.editorAssetTypeManager && editorOpts.usedAssetUuidsSymbol && editorOpts.assetManager && editorOpts.editorAssetTypeManager.constructorHasAssetType(propertyData.type)) {
				let usedAssetUuids = object[editorOpts.usedAssetUuidsSymbol];
				if (!usedAssetUuids) {
					usedAssetUuids = {};
					object[editorOpts.usedAssetUuidsSymbol] = usedAssetUuids;
				}
				usedAssetUuids[propertyName] = propertyData.defaultValue;
				const promise = (async () => {
					object[propertyName] = null;
					object[propertyName] = await editorOpts.assetManager.getLiveAsset(propertyData.defaultValue);
				})();
				if (EDITOR_DEFAULTS_IN_COMPONENTS) {
					this[settingDefaultsPromisesSym].push(promise);
				}
			} else {
				object[propertyName] = propertyData.defaultValue;
			}
		} else if (propertyData.type instanceof Array) {
			object[propertyName] = propertyData.type[0];
		} else if (propertyData.type == Vec2 || propertyData.type == Vec3 || propertyData.type == Vec3 || propertyData.type == Mat4) { // todo, use a global list of math types
			const constructor = propertyData.type;
			object[propertyName] = new constructor();
		} else {
			object[propertyName] = null;
		}
	}

	async waitForEditorDefaults() {
		if (!EDITOR_DEFAULTS_IN_COMPONENTS) return;
		if (this[editorDefaultsHandledSym]) return;
		await new Promise(r => this[onEditorDefaultsCbsSym].add(r));
	}
}
