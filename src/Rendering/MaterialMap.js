/** @typedef {number | import("../Math/Vec2.js").Vec2 | import("../Math/Vec3.js").Vec3 | import("../Math/Vec4.js").Vec4 | import("../Math/Quat.js").Quat} MappableMaterialTypes */

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
	 * Maps a property name to the original name as needed by the map type.
	 * Iterates over all map types and yields the original name per map type.
	 * @param {string} key
	 * @returns {Generator<[typeof import("./MaterialMapType.js").MaterialMapType, string]>}
	 */
	*mapProperty(key) {
		for (const [mapType, mappedDatas] of this.inverseMappedData) {
			const mappedData = mappedDatas.get(key);
			if (!mappedData) continue;
			yield [mapType, mappedData.mappedName];
		}
	}

	/**
	 * Gets the default value from the first found map type that contains the property.
	 * Mapped values should not be able to contain multiple properties with the same name
	 * but a different default value, so returning the first one is fine.
	 * @param {string} key
	 */
	getDefaultValue(key) {
		for (const mappedDatas of this.inverseMappedData.values()) {
			const mappedData = mappedDatas.get(key);
			if (mappedData) {
				return mappedData.defaultValue;
			}
		}
		return null;
	}

	/**
	 * @param {typeof import("./MaterialMapType.js").MaterialMapType} mapType
	 */
	*getAllOriginalNames(mapType) {
		const mappedDatas = this.inverseMappedData.get(mapType);
		if (mappedDatas) {
			for (const mappedData of mappedDatas.values()) {
				yield mappedData.mappedName;
			}
		}
	}
}
