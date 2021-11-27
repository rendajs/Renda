import {MaterialMap} from "./MaterialMap.js";
import {MaterialMapType} from "./MaterialMapType.js";

export class Material {
	/**
	 * @param {MaterialMap} materialMap
	 */
	constructor(materialMap) {
		this.materialMap = materialMap;
		this.onDestructorCbs = new Set();
		this.destructed = false;

		/** @type {Map<string, *>} */
		this.properties = new Map();
		/** @type {Map<typeof MaterialMapType, Map<string, *>>} */
		this.mappedProperties = new Map();
	}

	destructor() {
		for (const cb of this.onDestructorCbs) {
			cb();
		}
		this.onDestructorCbs.clear();

		this.destructed = true;
	}

	onDestructor(cb) {
		this.onDestructorCbs.add(cb);
	}

	removeOnDestructor(cb) {
		this.onDestructorCbs.delete(cb);
	}

	/**
	 * @param {Object.<string, *>} setObject
	 */
	setProperties(setObject) {
		for (const [key, value] of Object.entries(setObject)) {
			this.properties.set(key, value);
			for (const [mapType, mappedKey] of this.materialMap.mapProperty(key)) {
				let mappedProperties = this.mappedProperties.get(mapType);
				if (!mappedProperties) {
					mappedProperties = new Map();
					this.mappedProperties.set(mapType, mappedProperties);
				}
				mappedProperties.set(mappedKey, value);
			}
		}
	}

	/**
	 * @return {Generator<[string, *]>}
	 */
	*getAllProperties() {
		yield* this.properties.entries();
	}
}
