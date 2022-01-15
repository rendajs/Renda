import {MaterialMap} from "./MaterialMap.js";
import {MaterialMapType} from "./MaterialMapType.js";

export class Material {
	/**
	 * @param {MaterialMap?} materialMap
	 * @param {Object.<string, *>} properties
	 */
	constructor(materialMap, properties = {}) {
		this.materialMap = materialMap;
		this.onDestructorCbs = new Set();
		this.destructed = false;

		/** @type {Map<string, *>} */
		this.properties = new Map();
		/** @type {Map<typeof MaterialMapType, Map<string, *>>} */
		this.mappedProperties = new Map();

		this.setProperties(properties);
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
	 * Replaces the current material map and transfers the necessary properties.
	 * Properties that are not used by this material map will be removed.
	 * @param {MaterialMap?} materialMap
	 */
	setMaterialMap(materialMap) {
		this.materialMap = materialMap || null;
		const oldProperties = {};
		for (const [key, value] of this.properties) {
			oldProperties[key] = value;
		}
		this.properties = new Map();
		this.mappedProperties = new Map();

		this.setProperties(oldProperties);
	}

	/**
	 * @param {Object.<string, *>} setObject
	 */
	setProperties(setObject) {
		if (!this.materialMap) return;

		for (const [key, value] of Object.entries(setObject)) {
			let existingValue = this.properties.get(key);
			if (!existingValue) {
				existingValue = this.materialMap.getDefaultValue(key);
				if (typeof existingValue != "number") {
					existingValue = existingValue.clone();
				}
				this._setMappedProperty(key, existingValue);
			}

			if (typeof existingValue == "number") {
				existingValue = value;
				this._setMappedProperty(key, value);
				this.properties.set(key, value);
			} else {
				existingValue.set(value);
			}
		}
	}

	/**
	 * @param {string} key
	 * @param {*} value
	 */
	_setMappedProperty(key, value) {
		this.properties.set(key, value);
		for (const [mapType, originalKey] of this.materialMap.mapProperty(key)) {
			let mappedProperties = this.mappedProperties.get(mapType);
			if (!mappedProperties) {
				mappedProperties = new Map();
				this.mappedProperties.set(mapType, mappedProperties);
			}
			mappedProperties.set(originalKey, value);
		}
	}

	/**
	 * @return {Generator<[string, *]>}
	 */
	*getAllProperties() {
		yield* this.properties.entries();
	}

	/**
	 * @param {typeof MaterialMapType} mapType
	 */
	*getAllMappedProperties(mapType) {
		if (!this.materialMap) return;

		const mappedProperties = this.mappedProperties.get(mapType);

		for (const originalName of this.materialMap.getAllOriginalNames(mapType)) {
			let value = null;
			if (mappedProperties && mappedProperties.has(originalName)) {
				value = mappedProperties.get(originalName);
			}
			if (value == null) {
				value = this.materialMap.getDefaultValue(originalName);
			}
			yield [originalName, value];
		}
	}
}
