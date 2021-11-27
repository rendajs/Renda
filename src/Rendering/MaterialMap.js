import {MaterialMapType} from "./MaterialMapType.js";

/**
 * @typedef {Object} MaterialMapMappedValue
 * @property {string} mappedName
 * @property {*} defaultValue
 */

/** @typedef {Object.<string, MaterialMapMappedValue>} MaterialMapMappedValues */

/**
 * @typedef {Object} MaterialMapTypeData
 * @property {MaterialMapType} mapType
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
		/** @type {Map<typeof MaterialMapType, MaterialMapType>} */
		this.mapTypes = new Map();
		/** @type {Map<typeof MaterialMapType, Map<string, string>>} */
		this.mappedNames = new Map();
		for (const {mapType, mappedValues} of materialMapTypes) {
			const castConstructor = /** @type {typeof MaterialMapType} */ (mapType.constructor);
			this.mapTypes.set(castConstructor, mapType);
			/** @type {Map<string, string>} */
			const mappedNamesMap = new Map();
			for (const [originalName, {mappedName}] of Object.entries(mappedValues)) {
				mappedNamesMap.set(mappedName, originalName);
			}
			this.mappedNames.set(castConstructor, mappedNamesMap);
		}
	}

	/**
	 * @template {MaterialMapType} T
	 * @param {new (...args: *) => T} mapType
	 * @returns {T}
	 */
	getMapTypeInstance(mapType) {
		const instance = this.mapTypes.get(mapType);
		const castInstance = /** @type {T extends MaterialMapType ? T : never} */ (instance);
		return castInstance;
	}

	/**
	 * @param {string} key
	 * @returns {Generator<[typeof MaterialMapType, string]>}
	 */
	*mapProperty(key) {
		for (const [mapType, mappedNames] of this.mappedNames) {
			const mappedName = mappedNames.get(key);
			yield [mapType, mappedName];
		}
	}
}
