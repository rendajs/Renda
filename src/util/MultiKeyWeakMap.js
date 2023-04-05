const endNode = {};

/**
 * @template {any[]} [K = unknown[]]
 * @template [V = unknown]
 */
export class MultiKeyWeakMap {
	/**
	 * @param {Iterable<[K, V]>} iterable
	 */
	constructor(iterable = []) {
		this.maps = new WeakMap();
		if (iterable) {
			for (const [keys, value] of iterable) {
				this.set(keys, value);
			}
		}
	}

	/**
	 * @template {boolean} C
	 * @typedef {C extends true ? WeakMap<Object, any> : WeakMap<Object, any> | undefined} GetLastMapReturnType
	 */

	/**
	 * @private
	 * @template {boolean} C
	 * @param {K} keys
	 * @param {C} create
	 */
	getLastMap(keys, create = /** @type {C} */ (false)) {
		let map = this.maps;
		for (const key of keys) {
			if (map.has(key)) {
				map = map.get(key);
			} else if (create) {
				const newMap = new WeakMap();
				map.set(key, newMap);
				map = newMap;
			} else {
				return /** @type {GetLastMapReturnType<C>} */ (undefined);
			}
		}
		return /** @type {GetLastMapReturnType<C>} */ (map);
	}

	/**
	 * @param {K} keys
	 * @param {V} value
	 */
	set(keys, value) {
		const map = this.getLastMap(keys, true);
		map.set(endNode, value);
		return this;
	}

	/**
	 * @param {K} keys
	 * @returns {V | undefined}
	 */
	get(keys) {
		const map = this.getLastMap(keys);
		if (!map) return undefined;
		return map.get(endNode);
	}

	/**
	 * @param {K} keys
	 */
	has(keys) {
		const map = this.getLastMap(keys);
		if (!map) return false;
		return map.has(endNode);
	}

	/**
	 * @param {K} keys
	 */
	delete(keys) {
		const map = this.getLastMap(keys);
		if (!map) return false;
		return map.delete(endNode);
	}
}
