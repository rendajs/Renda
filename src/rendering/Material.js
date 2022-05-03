import {Texture} from "../core/Texture.js";
import {Vec2} from "../math/Vec2.js";
import {Vec3} from "../math/Vec3.js";
import {Vec4} from "../math/Vec4.js";

export class Material {
	/**
	 * @param {import("./MaterialMap.js").MaterialMap?} materialMap
	 * @param {Object.<string, *>} properties
	 */
	constructor(materialMap = null, properties = {}) {
		this._materialMap = materialMap;
		/** @type {Set<() => void>} */
		this.onDestructorCbs = new Set();
		this.destructed = false;

		/** @type {Map<string, import("./MaterialMap.js").MappableMaterialTypes>} */
		this.properties = new Map();
		/** @type {Map<typeof import("./MaterialMapType.js").MaterialMapType, Map<string, import("./MaterialMap.js").MappableMaterialTypes>>} */
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
	 * Replaces the current material map and transfers the existing properties
	 * to the new mapped ones. If the material contains properties that are not
	 * defined in the new material map, they will remain stored in case another
	 * material map is set later.
	 * @param {import("./MaterialMap.js").MaterialMap?} materialMap
	 */
	setMaterialMap(materialMap) {
		this._materialMap = materialMap;
		/** @type {Object.<string, import("./MaterialMap.js").MappableMaterialTypes>} */
		const oldProperties = {};
		for (const [key, value] of this.properties) {
			oldProperties[key] = value;
		}
		this.properties = new Map();
		this.mappedProperties = new Map();

		this.setProperties(oldProperties);
	}

	get materialMap() {
		return this._materialMap;
	}

	/**
	 * Sets values of multiple properties.
	 * See {@linkcode setProperty} for more info.
	 * @param {Object.<string, import("./MaterialMap.js").MappableMaterialTypes>} setObject
	 */
	setProperties(setObject) {
		for (const [key, value] of Object.entries(setObject)) {
			this.setProperty(key, value);
		}
	}

	/**
	 * Sets the value of a property. The key should be a mapped name in the
	 * material map. I.e. the name that appears in the properties window when
	 * the material is selected. If a property is not defined in the material
	 * map, it will not be used, but it will be stored in case a different
	 * material map containing this property is set later.
	 *
	 * @param {string} key
	 * @param {import("./MaterialMap.js").MappableMaterialTypes} value
	 */
	setProperty(key, value) {
		let foundDefaultValue = null;
		// Check if the new value matches the type of the configured default value.
		if (this._materialMap) {
			const mappedDatas = Array.from(this._materialMap.mapProperty(key));
			for (const [mapType, mappedData] of mappedDatas) {
				const expectedType = this._isExpectedType(value, mappedData.mappedType);
				if (!expectedType) {
					this._throwInvalidPropertyType(key, mappedData.defaultValue, value, mapType);
				}
				foundDefaultValue = mappedData.defaultValue;
			}
		}

		if (this._isArrayAndVectorType(value, foundDefaultValue)) {
			const castValue = /** @type {number[]} */ (value);
			const castDefault = /** @type {Vec2 | Vec3 | Vec4} */ (foundDefaultValue);
			const newValue = castDefault.clone().set(castValue);
			value = newValue;
		}

		const existingValue = this.properties.get(key) || null;
		const isSameType = existingValue && value instanceof existingValue.constructor;
		if (isSameType && (existingValue instanceof Vec2 || existingValue instanceof Vec3 || existingValue instanceof Vec4)) {
			const castValue = /** @type {Vec2 | Vec3 | Vec4} */ (value);
			existingValue.set(castValue);
		} else {
			this.properties.set(key, value);
			if (this._materialMap) {
				for (const [mapType, mappedData] of this._materialMap.mapProperty(key)) {
					let mappedProperties = this.mappedProperties.get(mapType);
					if (!mappedProperties) {
						mappedProperties = new Map();
						this.mappedProperties.set(mapType, mappedProperties);
					}
					mappedProperties.set(mappedData.mappedName, value);
				}
			}
		}
	}

	/**
	 * @private
	 * @param {import("./MaterialMap.js").MappableMaterialTypes} value
	 * @param {import("./MaterialMap.js").MappableMaterialTypesEnum} expectedType
	 */
	_isExpectedType(value, expectedType) {
		if (!value) return true;
		if (expectedType == "number") {
			return typeof value == "number";
		} else if (expectedType == "vec2") {
			return value instanceof Vec2 || (value instanceof Array && value.length == 2);
		} else if (expectedType == "vec3") {
			return value instanceof Vec3 || (value instanceof Array && value.length == 3);
		} else if (expectedType == "vec4") {
			return value instanceof Vec4 || (value instanceof Array && value.length == 4);
		} else if (expectedType == "texture2d") {
			return value instanceof Texture;
		} else if (expectedType == "sampler") {
			// todo
			return false;
		}
		return false;
	}

	/**
	 * @private
	 * @param {import("./MaterialMap.js").MappableMaterialTypes} array
	 * @param {import("./MaterialMap.js").MappableMaterialTypes | null} vec
	 */
	_isArrayAndVectorType(array, vec) {
		if (Array.isArray(array)) {
			if (vec instanceof Vec2 && array.length == 2) {
				return true;
			}
			if (vec instanceof Vec3 && array.length == 3) {
				return true;
			}
			if (vec instanceof Vec4 && array.length == 4) {
				return true;
			}
		}
		return false;
	}

	/**
	 * @param {string} key
	 * @param {import("./MaterialMap.js").MappableMaterialTypes} expectedType
	 * @param {import("./MaterialMap.js").MappableMaterialTypes} receivedType
	 * @param {typeof import("./MaterialMapType.js").MaterialMapType} mapType
	 * @returns {never}
	 */
	_throwInvalidPropertyType(key, expectedType, receivedType, mapType) {
		const expectedTypeStr = this._mappableMaterialTypeToString(expectedType);
		const receivedTypeStr = this._mappableMaterialTypeToString(receivedType);
		throw new TypeError(`Invalid type received for "${key}". Received ${receivedTypeStr} but in the "${mapType.name}" a ${expectedTypeStr} was configured.`);
	}

	/**
	 * @param {import("./MaterialMap.js").MappableMaterialTypes} mappableMaterialType
	 */
	_mappableMaterialTypeToString(mappableMaterialType) {
		if (!mappableMaterialType) {
			return "null";
		} else if (typeof mappableMaterialType == "number") {
			return "number";
		} else {
			return mappableMaterialType.constructor.name;
		}
	}

	/**
	 * @return {Generator<[string, import("./MaterialMap.js").MappableMaterialTypes]>}
	 */
	*getAllProperties() {
		yield* this.properties.entries();
	}

	/**
	 * @param {string} key
	 */
	getProperty(key) {
		return this.properties.get(key) ?? null;
	}

	/**
	 * @param {import("./MaterialMap.js").MaterialMapMappedValue} mappedData
	 * @param {Map<string, import("./MaterialMap.js").MappableMaterialTypes> | undefined} mappedProperties
	 */
	_getValueFromMappedData(mappedData, mappedProperties) {
		if (mappedProperties && mappedProperties.has(mappedData.mappedName)) {
			const value = mappedProperties.get(mappedData.mappedName);
			return /** @type {import("./MaterialMap.js").MappableMaterialTypes} */ (value);
		}
		const defaultValue = mappedData.defaultValue;
		return defaultValue;
	}

	/**
	 * Returns a list of all [key, value] pairs that are needed according to
	 * the material map. Where `key` is the original key set by the material
	 * map, and `value` is either the default value, or a new value if it was
	 * modified by this material.
	 * @param {typeof import("./MaterialMapType.js").MaterialMapType} mapType
	 * @returns {Generator<[string, import("./MaterialMap.js").MappableMaterialTypes]>}
	 */
	*getAllMappedProperties(mapType) {
		if (!this._materialMap) return;

		const mappedProperties = this.mappedProperties.get(mapType);

		for (const mappedData of this._materialMap.getMappedDatas(mapType)) {
			yield [mappedData.mappedName, this._getValueFromMappedData(mappedData, mappedProperties)];
		}
	}

	/**
	 * @param {typeof import("./MaterialMapType.js").MaterialMapType} mapType
	 * @param {string} mappedName
	 */
	getMappedProperty(mapType, mappedName) {
		if (!this._materialMap) return null;

		const mappedProperties = this.mappedProperties.get(mapType);

		for (const mappeddata of this._materialMap.getMappedDatas(mapType)) {
			if (mappeddata.mappedName == mappedName) {
				return this._getValueFromMappedData(mappeddata, mappedProperties);
			}
		}
		return null;
	}

	clone() {
		const clone = new Material();
		clone.setMaterialMap(this.materialMap);
		for (const [key, value] of this.getAllProperties()) {
			let newValue = value;
			if (typeof value == "number") {
				// value doesn't need to be cloned
			} else if (value instanceof Array) {
				newValue = [...value];
			} else if (value instanceof Vec2 || value instanceof Vec3 || value instanceof Vec4) {
				newValue = value.clone();
			}
			clone.setProperty(key, newValue);
		}
		return clone;
	}
}
