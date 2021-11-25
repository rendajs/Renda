import {MaterialMapType} from "./MaterialMapType.js";

export class MaterialMap {
	/**
	 * @param {Object} options
	 * @param {Iterable<MaterialMapType>} [options.materialMapTypes]
	 */
	constructor({
		materialMapTypes = [],
	} = {}) {
		/** @type {Map<typeof MaterialMapType, MaterialMapType>} */
		this.mapTypes = new Map();
		for (const settings of materialMapTypes) {
			const castConstructor = /** @type {typeof MaterialMapType} */ (settings.constructor);
			this.mapTypes.set(castConstructor, settings);
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
}
