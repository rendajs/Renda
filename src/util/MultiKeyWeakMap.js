/**
 * @template {any[]} [K = unknown[]]
 * @template [V = unknown]
 */
export class MultiKeyWeakMap {
	/**
	 * @typedef WeakMapNode
	 * @property {WeakMap<any, WeakMapNode>} weakMap
	 * @property {Map<number | string | symbol, WeakRef<WeakMapNode>>} map
	 * @property {V | undefined} value
	 */
	/**
	 * @param {Iterable<[K, V]>} iterable
	 */
	constructor(iterable = []) {
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
			// Objects can be used in WeakMap keys, for strings, numbers and symbols we use a Map with WeakRefs.
			if ((typeof key == "object" || typeof key == "function" || typeof key == "symbol") && key !== null) {
				let nextNode = currentNode.weakMap.get(key);
				if (!nextNode && create) {
					nextNode = this._createEmptyNode();
					currentNode.weakMap.set(key, nextNode);
				}
				if (!nextNode) {
					return /** @type {GetLastMapReturnType<C>} */ (undefined);
				}
				currentNode = nextNode;
			} else {
				let weakRef = currentNode.map.get(key);
				let nextNode;
				if (!weakRef && create) {
					nextNode = this._createEmptyNode();
					weakRef = new WeakRef(nextNode);
					currentNode.map.set(key, weakRef);
				}
				if (!nextNode) {
					nextNode = weakRef && weakRef.deref();
				}
				if (!nextNode) {
					return /** @type {GetLastMapReturnType<C>} */ (undefined);
				}
				currentNode = nextNode;
			}
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
