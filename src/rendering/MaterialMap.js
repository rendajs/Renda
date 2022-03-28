import {Vec2} from "../math/Vec2.js";
import {Vec3} from "../math/Vec3.js";
import {Vec4} from "../math/Vec4.js";
import {Quat} from "../math/Quat.js";

/** @typedef {number | number[] | import("../math/Vec2.js").Vec2 | import("../math/Vec3.js").Vec3 | import("../math/Vec4.js").Vec4 | import("../math/Quat.js").Quat} MappableMaterialTypes */

/**
 * @typedef {Object} MaterialMapMappedValue
 * @property {string} mappedName
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

		// TODO: add support for mapping multiple properties to the same name
		// Currently inverseMappedData values get overwritten if two names are the same.
		/** @type {Map<typeof import("./MaterialMapType.js").MaterialMapType, Map<string, MaterialMapMappedValue>>} */
		this.inverseMappedData = new Map();
		for (const {mapType, mappedValues} of materialMapTypes) {
			const castConstructor = /** @type {typeof import("./MaterialMapType.js").MaterialMapType} */ (mapType.constructor);
			this.mapTypes.set(castConstructor, mapType);
			/** @type {Map<string, MaterialMapMappedValue>} */
			const mappedNamesMap = new Map();
			for (const [originalName, {mappedName, defaultValue}] of Object.entries(mappedValues)) {
				mappedNamesMap.set(mappedName, {
					mappedName: originalName,
					defaultValue,
				});
			}
			this.inverseMappedData.set(castConstructor, mappedNamesMap);
		}
	}

	/**
	 * @template {import("./MaterialMapType.js").MaterialMapType} T
	 * @param {new (...args: *) => T} mapType
	 * @returns {T}
	 */
	getMapTypeInstance(mapType) {
		const instance = this.mapTypes.get(mapType);
		const castInstance = /** @type {T extends import("./MaterialMapType.js").MaterialMapType ? T : never} */ (instance);
		return castInstance;
	}

	/**
	 * Iterates over all map types and yields the original names for this key.
	 * @param {string} key
	 * @returns {Generator<[typeof import("./MaterialMapType.js").MaterialMapType, MaterialMapMappedValue]>}
	 */
	*mapProperty(key) {
		for (const [mapType, mappedDatas] of this.inverseMappedData) {
			const mappedData = mappedDatas.get(key);
			if (!mappedData) continue;
			yield [mapType, mappedData];
		}
	}

	/**
	 * @param {typeof import("./MaterialMapType.js").MaterialMapType} mapType
	 */
	*getMappedDatas(mapType) {
		const mappedDatas = this.inverseMappedData.get(mapType);
		if (mappedDatas) {
			yield* mappedDatas.values();
		}
	}

	/**
	 * @param {unknown} value
	 * @returns {asserts value is MappableMaterialTypes}
	 */
	static assertIsMappableType(value) {
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

		if (value instanceof Vec2 || value instanceof Vec3 || value instanceof Vec4 || value instanceof Quat) return;

		throw new Error(`Value is not a mappable material type: ${value}`);
	}
}
