import {autoRegisterMaterialMapTypeSerializers} from "./materialMapTypes/autoRegisterMaterialMapTypeSerializers.js";
import {MaterialMapTypeSerializer} from "./materialMapTypes/MaterialMapTypeSerializer.js";
import {isUuid} from "../../../../../src/util/mod.js";
import {getEditorInstance} from "../../../editorInstance.js";

/**
 * @typedef {Object} MaterialMapMappedValueAssetData
 * @property {boolean} [visible]
 * @property {string} [mappedName]
 * @property {*} [defaultValue]
 */

/** @typedef {Object.<string, MaterialMapMappedValueAssetData>} MaterialMapMappedValuesAssetData */

/**
 * @typedef {Object} MaterialMapAssetData
 * @property {MaterialMapTypeAssetData[]} maps
 */

/**
 * @typedef {Object} MaterialMapTypeAssetData
 * @property {import("../../../../../src/util/mod.js").UuidString} mapTypeId
 * @property {*} [customData]
 * @property {MaterialMapMappedValuesAssetData} [mappedValues]
 */

export class MaterialMapTypeSerializerManager {
	constructor() {
		this.registeredMapTypes = new Map();
	}

	init() {
		for (const t of autoRegisterMaterialMapTypeSerializers) {
			this.registerMapType(t);
		}
	}

	/**
	 * @param {import("./materialMapTypes/MaterialMapTypeSerializer.js").MaterialMapTypeSerializerConstructor} constructor
	 */
	registerMapType(constructor) {
		if (!(constructor.prototype instanceof MaterialMapTypeSerializer)) {
			console.warn("Tried to register a MaterialMapType type (" + constructor.name + ") that does not extend MaterialMapType class.");
			return;
		}

		const castConstructor = /** @type {typeof MaterialMapTypeSerializer} */ (constructor);

		if (castConstructor.uiName == null || typeof castConstructor.uiName != "string") {
			castConstructor.invalidConfigurationWarning("Failed to register MaterialMapType (" + constructor.name + ") invalid uiName value.");
			return;
		}

		const hasMapContentConstructor = castConstructor.propertiesMaterialMapContentConstructor != null && typeof castConstructor.propertiesMaterialMapContentConstructor == "function";
		const hasSettingsStructure = castConstructor.settingsStructure != null && typeof castConstructor.settingsStructure == "object";
		if (!hasMapContentConstructor && !hasSettingsStructure) {
			castConstructor.invalidConfigurationWarning("Failed to register MaterialMapType (" + constructor.name + "). The material map should at least have a settingsStructure or a propertiesMaterialMapContentConstructor.");
			return;
		}

		if (castConstructor.typeUuid && !isUuid(castConstructor.typeUuid)) {
			castConstructor.invalidConfigurationWarning("Tried to register MaterialMapType (" + constructor.name + ") without a valid typeUuid, override the static typeUuid value in order for this MaterialMapType to function properly.");
			return;
		}

		this.registeredMapTypes.set(castConstructor.typeUuid, constructor);
	}

	*getAllTypes() {
		for (const type of this.registeredMapTypes.values()) {
			yield type;
		}
	}

	/**
	 * @param {string} uuid
	 * @returns {typeof MaterialMapTypeSerializer}
	 */
	getTypeByUuid(uuid) {
		return this.registeredMapTypes.get(uuid);
	}

	/**
	 * @param {import("../../../../../src/util/mod.js").UuidString} mapAssetUuid
	 * @returns {Promise<import("./materialMapTypes/MaterialMapTypeSerializer.js").MaterialMapTypeMappableValue[]>}
	 */
	async getMapValuesForMapAssetUuid(mapAssetUuid) {
		if (!mapAssetUuid) return [];
		const assetManager = await getEditorInstance().projectManager.getAssetManager();
		const mapProjectAsset = await assetManager.getProjectAsset(mapAssetUuid);
		const mapAsset = /** @type {import("../../ProjectAsset.js").ProjectAsset<import("./ProjectAssetTypeMaterialMap.js").ProjectAssetTypeMaterialMap>} */ (mapProjectAsset);
		if (!mapAsset) return [];
		/** @type {Map<string, import("./materialMapTypes/MaterialMapTypeSerializer.js").MaterialMapTypeMappableValue>} */
		const mapValues = new Map();
		if (await mapAsset.getIsDeleted()) return [];
		/** @type {MaterialMapAssetData} */
		const mapData = await mapAsset.readAssetData();
		const editor = getEditorInstance();
		for (const mapType of mapData.maps) {
			if (!mapType.mappedValues) continue;
			const mapTypeConstructor = this.getTypeByUuid(mapType.mapTypeId);
			const values = await mapTypeConstructor.getMappedValues(editor, assetManager, mapType.customData, mapType.mappedValues);
			for (const value of values) {
				mapValues.set(value.name, value);
			}
		}
		return Array.from(mapValues.values());
	}
}
