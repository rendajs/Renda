export class Material {
	/**
	 * @param {import("./MaterialMap.js").MaterialMap?} materialMap
	 * @param {Object.<string, *>} properties
	 */
	constructor(materialMap = null, properties = {}) {
		this.materialMap = materialMap;
		/** @type {Set<() => void>} */
		this.onDestructorCbs = new Set();
		this.destructed = false;

		/** @type {Map<string, import("./MaterialMap.js").MappableMaterialTypes>} */
		this.properties = new Map();
		/** @type {Map<typeof import("./MaterialMapType.js").MaterialMapType, Map<string, *>>} */
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

	/**
	 * @param {() => void} cb
	 */
	onDestructor(cb) {
		this.onDestructorCbs.add(cb);
	}

	/**
	 * @param {() => void} cb
	 */
	removeOnDestructor(cb) {
		this.onDestructorCbs.delete(cb);
	}

	/**
	 * Replaces the current material map and transfers the necessary properties.
	 * Properties that are not used by this material map will be removed.
	 * @param {import("./MaterialMap.js").MaterialMap?} materialMap
	 */
	setMaterialMap(materialMap) {
		this.materialMap = materialMap || null;
		/** @type {Object.<string, import("./MaterialMap.js").MappableMaterialTypes>} */
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
			let existingValue = this.properties.get(key) || null;
			if (!existingValue) {
				existingValue = this.materialMap.getDefaultValue(key);
				if (existingValue && typeof existingValue != "number") {
					existingValue = existingValue.clone();
				}
				this._setMappedProperty(key, existingValue);
			}

			if (typeof existingValue == "number") {
				existingValue = value;
				this._setMappedProperty(key, value);
				this.properties.set(key, value);
			} else if (existingValue) {
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
		if (!this.materialMap) return;
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
	 * @param {typeof import("./MaterialMapType.js").MaterialMapType} mapType
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
