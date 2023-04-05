/**
 * @template {any[]} [K = unknown[]]
 * @template [V = unknown]
 */
export class MultiKeyWeakMap {
	/**
	 * @typedef WeakMapNode
	 * @property {WeakMap<any, WeakMapNode>} weakMap
	 * @property {Map<number | string | symbol, WeakMapNode>} map
	 * @property {V | undefined} value
	 */
	/**
	 * @param {Iterable<[K, V]>} iterable
	 * @param {object} options
	 * @param {boolean} [options.allowNonObjects] Set to true if you want to be able to include strings, numbers etc. as keys.
	 * This is not the default because the behaviour is kind of unexpected. Since there is no way to store references of strings,
	 * this means the values of string keys will never be garbage collected.
	 * To avoid this you should always make sure to also use an object that can be garbage collected in your key array.
	 */
	constructor(iterable = [], {
		allowNonObjects = false,
	} = {}) {
		this.allowNonObjects = allowNonObjects;
		this.rootNode = this._createEmptyNode();
		if (iterable) {
			for (const [keys, value] of iterable) {
				this.set(keys, value);
			}
		}
	}

	/**
	 * @template {boolean} C
	 * @typedef {C extends true ? WeakMapNode : WeakMapNode | undefined} GetLastMapReturnType
	 */

	/**
	 * @private
	 */
	_createEmptyNode() {
		/** @type {WeakMapNode} */
		const node = {
			weakMap: new WeakMap(),
			map: new Map(),
			value: undefined,
		};
		return node;
	}

	/**
	 * @private
	 * @template {boolean} C
	 * @param {K} keys
	 * @param {C} create
	 */
	_getLastNode(keys, create = /** @type {C} */ (false)) {
		let currentNode = this.rootNode;
		for (const key of keys) {
			let map;
			// Objects can be used in WeakMap keys, for strings, numbers and symbols we use a Regular Map.
			if ((typeof key == "object" || typeof key == "function" || typeof key == "symbol") && key !== null) {
				map = currentNode.weakMap;
			} else {
				if (this.allowNonObjects) {
					map = currentNode.map;
				} else {
					throw new Error("MultiKeyWeakMap only supports objects as keys. If you want to use non-objects as keys, set allowNonObjects to true.");
				}
			}
			let nextNode = map.get(key);
			if (!nextNode && create) {
				nextNode = this._createEmptyNode();
				map.set(key, nextNode);
			}
			if (!nextNode) {
				return /** @type {GetLastMapReturnType<C>} */ (undefined);
			}
			currentNode = nextNode;
		}
		return /** @type {GetLastMapReturnType<C>} */ (currentNode);
	}

	/**
	 * @param {K} keys
	 * @param {V} value
	 */
	set(keys, value) {
		const node = this._getLastNode(keys, true);
		node.value = value;
		return this;
	}

	/**
	 * @param {K} keys
	 * @returns {V | undefined}
	 */
	get(keys) {
		const node = this._getLastNode(keys);
		if (!node) return undefined;
		return node.value;
	}

	/**
	 * @param {K} keys
	 */
	has(keys) {
		const node = this._getLastNode(keys);
		if (!node) return false;
		return node.value !== undefined;
	}

	/**
	 * @param {K} keys
	 */
	delete(keys) {
		const node = this._getLastNode(keys);
		if (!node || node.value === undefined) return false;
		node.value = undefined;
		return true;
	}
}
