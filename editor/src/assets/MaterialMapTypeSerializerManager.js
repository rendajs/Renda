import {autoRegisterMaterialMapTypeSerializers} from "./materialMapTypeSerializers/autoRegisterMaterialMapTypeSerializers.js";
import {MaterialMapTypeSerializer} from "./materialMapTypeSerializers/MaterialMapTypeSerializer.js";
import {isUuid} from "../../../src/util/mod.js";
import {getEditorInstance} from "../editorInstance.js";
import {ProjectAssetTypeMaterialMap} from "./projectAssetType/ProjectAssetTypeMaterialMap.js";

/**
 * @typedef {object} MaterialMapMappedValueAssetData
 * @property {boolean} [visible]
 * @property {string} [mappedName]
 * @property {*} [defaultValue]
 */

/** @typedef {Object<string, MaterialMapMappedValueAssetData>} MaterialMapMappedValuesAssetData */

/**
 * @typedef {object} MaterialMapAssetData
 * @property {MaterialMapTypeAssetData[]} [maps]
 */

/**
 * @typedef {object} MaterialMapTypeAssetData
 * @property {import("../../../src/util/mod.js").UuidString} mapTypeId
 * @property {*} [customData]
 * @property {MaterialMapMappedValuesAssetData} [mappedValues]
 */

export class MaterialMapTypeSerializerManager {
	constructor() {
		/** @type {Map<import("../../../src/mod.js").UuidString, typeof MaterialMapTypeSerializer>} */
		this.registeredMapTypes = new Map();
	}

	init() {
		for (const t of autoRegisterMaterialMapTypeSerializers) {
			this.registerMapType(t);
		}
	}

	/**
	 * @param {import("./materialMapTypeSerializers/MaterialMapTypeSerializer.js").MaterialMapTypeSerializerConstructor} constructor
	 */
	registerMapType(constructor) {
		if (!(constructor.prototype instanceof MaterialMapTypeSerializer)) {
			throw new Error(`Tried to register a MaterialMapType type (${constructor.name}) that does not extend MaterialMapType class.`);
		}

		const castConstructor = /** @type {typeof MaterialMapTypeSerializer} */ (constructor);

		if (!castConstructor.uiName) {
			throw new Error(`Failed to register MaterialMapType "${constructor.name}", invalid uiName value: "${castConstructor.uiName}"`);
		}

		if (!isUuid(castConstructor.typeUuid)) {
			throw new Error(`Failed to register MaterialMapType "${constructor.name}", invalid typeUuid value: "${castConstructor.typeUuid}".`);
		}

		const hasMapContentConstructor = castConstructor.propertiesMaterialMapContentConstructor != null && typeof castConstructor.propertiesMaterialMapContentConstructor == "function";
		const hasSettingsStructure = castConstructor.settingsStructure != null && typeof castConstructor.settingsStructure == "object";
		if (!hasMapContentConstructor && !hasSettingsStructure) {
			throw new Error(`Failed to register MaterialMapType "${constructor.name}", the type needs to have either a settingsStructure or a propertiesMaterialMapContentConstructor set.`);
		}

		this.registeredMapTypes.set(castConstructor.typeUuid, castConstructor);
	}

	*getAllTypes() {
		for (const type of this.registeredMapTypes.values()) {
			yield type;
		}
	}

	/**
	 * @param {string} uuid
	 * @returns {(typeof MaterialMapTypeSerializer | null)}
	 */
	getTypeByUuid(uuid) {
		return this.registeredMapTypes.get(uuid) || null;
	}

	/**
	 * @param {new (...args: any[]) => import("../../../src/rendering/MaterialMapType.js").MaterialMapType} liveAssetConstructor
	 */
	getTypeByLiveAssetConstructor(liveAssetConstructor) {
		for (const mapTypeConstructor of this.registeredMapTypes.values()) {
			if (mapTypeConstructor.expectedLiveAssetConstructor == liveAssetConstructor) {
				return mapTypeConstructor;
			}
		}
		return null;
	}

	/**
	 * @param {import("../../../src/util/mod.js").UuidString?} mapAssetUuid
	 * @returns {Promise<import("./materialMapTypeSerializers/MaterialMapTypeSerializer.js").MaterialMapTypeMappableValue[]>}
	 */
	async getMapValuesForMapAssetUuid(mapAssetUuid) {
		if (!mapAssetUuid) return [];
		const editor = getEditorInstance();
		const assetManager = await editor.projectManager.getAssetManager();
		const mapProjectAsset = await assetManager.getProjectAssetFromUuid(mapAssetUuid, {
			assertAssetType: ProjectAssetTypeMaterialMap,
		});
		if (!mapProjectAsset) return [];
		/** @type {Map<string, import("./materialMapTypeSerializers/MaterialMapTypeSerializer.js").MaterialMapTypeMappableValue>} */
		const mapValues = new Map();
		if (await mapProjectAsset.getIsDeleted()) return [];
		const mapData = await mapProjectAsset.readAssetData();
		if (mapData.maps) {
			const mapProjectAssetType = await mapProjectAsset.getProjectAssetType();
			if (!mapProjectAssetType) throw new Error("Assertion failed, material map asset has no project asset type.");
			const context = mapProjectAssetType.createLiveAssetDataContext();
			for (const mapType of mapData.maps) {
				const mapTypeConstructor = this.getTypeByUuid(mapType.mapTypeId);
				if (!mapTypeConstructor) continue;
				const values = await mapTypeConstructor.getMappedValues(context, mapType.customData, mapType.mappedValues || {});
				for (const value of values) {
					mapValues.set(value.name, value);
				}
			}
		}
		return Array.from(mapValues.values());
	}
}
