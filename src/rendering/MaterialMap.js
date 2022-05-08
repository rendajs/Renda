import {Vec2} from "../math/Vec2.js";
import {Vec3} from "../math/Vec3.js";
import {Vec4} from "../math/Vec4.js";
import {Quat} from "../math/Quat.js";
import {Texture} from "../core/Texture.js";

/** @typedef {number | number[] | Vec2 | Vec3 | Vec4 | Quat} MappableMaterialUniformTypes */
/** @typedef {MappableMaterialUniformTypes | Texture | null} MappableMaterialTypes */

/** @typedef {"number" | "vec2" | "vec3" | "vec4" | "sampler" | "texture2d"} MappableMaterialTypesEnum */
/**
 * @typedef {Object} MaterialMapMappedValue
 * @property {string} mappedName The new property name set by the user. I.e. the
 * value that appears in the material ui, and the key that is used in
 * `Material.setProperty(key, value)`.
 * @property {MappableMaterialTypesEnum} mappedType
 * @property {MappableMaterialTypes} defaultValue
 */

/** @typedef {Object.<string, MaterialMapMappedValue>} MaterialMapMappedValues */

/**
 * @typedef {Object} MaterialMapTypeData
 * @property {import("./MaterialMapType.js").MaterialMapType} mapType
 * @property {MaterialMapMappedValues} mappedValues
 */

export class MaterialMap {
	/**
	 * @param {Object} options
	 * @param {Iterable<MaterialMapTypeData>} [options.materialMapTypes]
	 */
	constructor({
		materialMapTypes = [],
	} = {}) {
		/** @type {Map<typeof import("./MaterialMapType.js").MaterialMapType, import("./MaterialMapType.js").MaterialMapType>} */
		this.mapTypes = new Map();

		/** @type {Map<typeof import("./MaterialMapType.js").MaterialMapType, Map<string, Set<MaterialMapMappedValue>>>} */
		this.inverseMappedData = new Map();
		for (const {mapType, mappedValues} of materialMapTypes) {
			const castConstructor = /** @type {typeof import("./MaterialMapType.js").MaterialMapType} */ (mapType.constructor);
			this.mapTypes.set(castConstructor, mapType);

			/** @type {Map<string, Set<MaterialMapMappedValue>>} */
			const mappedNamesMap = new Map();
			for (const [originalName, {mappedName, defaultValue, mappedType}] of Object.entries(mappedValues)) {
				let mappedNamesSet = mappedNamesMap.get(mappedName);
				if (!mappedNamesSet) {
					mappedNamesSet = new Set();
					mappedNamesMap.set(mappedName, mappedNamesSet);
				}
				mappedNamesSet.add({
					mappedName: originalName,
					defaultValue, mappedType,
				});
			}
			this.inverseMappedData.set(castConstructor, mappedNamesMap);
		}
	}

	/**
	 * @template {import("./MaterialMapType.js").MaterialMapType} T
	 * @param {new (...args: *) => T} mapType
	 */
	getMapTypeInstance(mapType) {
		const instance = this.mapTypes.get(mapType);
		return /** @type {T?} */ (instance);
	}

	/**
	 * Iterates over all map types and yields data containing mapped names for
	 * each property that has been renamed by the user to the provided key.
	 * @param {string} key The key used by the material, i.e. the property set
	 * by the user.
	 * @returns {Generator<[typeof import("./MaterialMapType.js").MaterialMapType, MaterialMapMappedValue]>}
	 */
	*mapProperty(key) {
		for (const [mapType, mappedDatas] of this.inverseMappedData) {
			const mappedData = mappedDatas.get(key);
			if (!mappedData) continue;
			for (const mappedDataItem of mappedData) {
				yield [mapType, mappedDataItem];
			}
		}
	}

	/**
	 * @param {typeof import("./MaterialMapType.js").MaterialMapType} mapType
	 */
	*getMappedDatasForMapType(mapType) {
		const mappedDatas = this.inverseMappedData.get(mapType);
		if (mappedDatas) {
			for (const mappedDataItems of mappedDatas.values()) {
				for (const item of mappedDataItems) {
					yield item;
				}
			}
		}
	}

	/**
	 * @param {unknown} value
	 * @returns {asserts value is MappableMaterialTypes}
	 */
	static assertIsMappableType(value) {
		if (value === null) return;
		if (typeof value == "number") return;

		if (value instanceof Array) {
			let allNumbers = true;
			for (const item of value) {
				if (typeof item != "number") {
					allNumbers = false;
					break;
				}
			}
			if (allNumbers) return;
		}

		if (value instanceof Vec2 || value instanceof Vec3 || value instanceof Vec4 || value instanceof Quat || value instanceof Texture) return;

		throw new Error(`Value is not a mappable material type: ${value}`);
	}
}
