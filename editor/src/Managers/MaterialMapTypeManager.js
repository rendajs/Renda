import {autoRegisterMaterialMapTypes} from "../PropertiesWindowContent/PropertiesAssetContent/PropertiesAssetContentMaterialMap/MaterialMapTypes/autoRegisterMaterialMapTypes.js";
import {MaterialMapType} from "../PropertiesWindowContent/PropertiesAssetContent/PropertiesAssetContentMaterialMap/MaterialMapTypes/MaterialMapType.js";
import {isUuid} from "../../../src/Util/Util.js";
import editor from "../editorInstance.js";

/**
 * @typedef {Object} MaterialMapAssetData
 * @property {MaterialMapTypeData[]} maps
 */

/**
 * @typedef {Object} MaterialMapTypeData
 * @property {import("../Util/Util.js").UuidString} mapTypeId
 * @property {*} customData
 * @property {MaterialMapMappedValues} mappedValues
 */

/** @typedef {Object.<string, MaterialMapMappedValue>} MaterialMapMappedValues */

/**
 * @typedef {Object} MaterialMapMappedValue
 * @property {boolean} visible
 * @property {string} mappedName
 * @property {*} defaultValue
 */

export class MaterialMapTypeManager {
	constructor() {
		this.registeredMapTypes = new Map();
	}

	init() {
		for (const t of autoRegisterMaterialMapTypes) {
			this.registerMapType(t);
		}
	}

	/**
	 * @param {typeof MaterialMapType} constructor
	 */
	registerMapType(constructor) {
		if (!(constructor.prototype instanceof MaterialMapType)) {
			console.warn("Tried to register a MaterialMapType type (" + constructor.name + ") that does not extend MaterialMapType class.");
			return;
		}

		if (constructor.uiName == null || typeof constructor.uiName != "string") {
			constructor.invalidConfigurationWarning("Failed to register MaterialMapType (" + constructor.name + ") invalid uiName value.");
			return;
		}

		const hasMapContentConstructor = constructor.propertiesMaterialMapContentConstructor != null && typeof constructor.propertiesMaterialMapContentConstructor == "function";
		const hasSettingsStructure = constructor.settingsStructure != null && typeof constructor.settingsStructure == "object";
		if (!hasMapContentConstructor && !hasSettingsStructure) {
			constructor.invalidConfigurationWarning("Failed to register MaterialMapType (" + constructor.name + "). The material map should at least have a settingsStructure or a propertiesMaterialMapContentConstructor.");
			return;
		}

		if (!isUuid(constructor.typeUuid)) {
			constructor.invalidConfigurationWarning("Tried to register MaterialMapType (" + constructor.name + ") without a valid typeUuid, override the static typeUuid value in order for this MaterialMapType to function properly.");
			return;
		}

		this.registeredMapTypes.set(constructor.typeUuid, constructor);
	}

	*getAllTypes() {
		for (const type of this.registeredMapTypes.values()) {
			yield type;
		}
	}

	/**
	 * @param {string} uuid
	 * @returns {typeof MaterialMapType}
	 */
	getTypeByUuid(uuid) {
		return this.registeredMapTypes.get(uuid);
	}

	/**
	 * @param {import("../Util/Util.js").UuidString} mapAssetUuid
	 * @returns {Promise<import("../PropertiesWindowContent/PropertiesAssetContent/PropertiesAssetContentMaterialMap/MaterialMapTypes/MaterialMapType.js").MaterialMapTypeMappedMaterialValue[]>}
	 */
	async getMapValuesForMapAssetUuid(mapAssetUuid) {
		if (!mapAssetUuid) return [];
		const mapAsset = await editor.projectManager.assetManager.getProjectAsset(mapAssetUuid);
		if (!mapAsset) return [];
		/** @type {Map<string, import("../PropertiesWindowContent/PropertiesAssetContent/PropertiesAssetContentMaterialMap/MaterialMapTypes/MaterialMapType.js").MaterialMapTypeMappedMaterialValue>} */
		const mapValues = new Map();
		if (await mapAsset.getIsDeleted()) return [];
		/** @type {MaterialMapAssetData} */
		const mapData = await mapAsset.readAssetData();
		for (const mapType of mapData.maps) {
			const mapTypeConstructor = this.getTypeByUuid(mapType.mapTypeId);
			const values = await mapTypeConstructor.getMappedValues(mapType.customData, mapType.mappedValues);
			for (const value of values) {
				mapValues.set(value.name, value);
			}
		}
		return Array.from(mapValues.values());
	}

	async getDataForMapProjectAsset(mapAsset) {
		const mapData = await mapAsset.readAssetData();
		const mapDatas = new Map();
		const linkedProjectAssets = new Set();
		for (const mapType of mapData.maps) {
			const mapTypeConstructor = this.getTypeByUuid(mapType.mapTypeId);
			const customData = await mapTypeConstructor.getLiveAssetCustomData(mapType.customData);
			mapDatas.set(mapType.mapTypeId, customData);

			for await (const projectAsset of mapTypeConstructor.getLinkedAssetsInCustomData(mapType.customData)) {
				linkedProjectAssets.add(projectAsset);
			}
		}
		return {mapDatas, linkedProjectAssets};
	}
}
