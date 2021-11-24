import {MaterialMapTypeSettings} from "./MaterialMapTypeSettings.js";

export class MaterialMap {
	/**
	 * @param {Object} options
	 * @param {Iterable<MaterialMapTypeSettings>} [options.materialMapTypes]
	 */
	constructor({
		materialMapTypes = [],
	} = {}) {
		/** @type {Map<typeof MaterialMapTypeSettings, MaterialMapTypeSettings>} */
		this.mapTypes = new Map();
		for (const settings of materialMapTypes) {
			const castConstructor = /** @type {typeof MaterialMapTypeSettings} */ (settings.constructor);
			this.mapTypes.set(castConstructor, settings);
		}
	}

	/**
	 * @template {MaterialMapTypeSettings} T
	 * @param {new (...args: *) => T} mapType
	 * @returns {T}
	 */
	getMapTypeInstance(mapType) {
		const instance = this.mapTypes.get(mapType);
		const castInstance = /** @type {T extends MaterialMapTypeSettings ? T : never} */ (instance);
		return castInstance;
	}
}
