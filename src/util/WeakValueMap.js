/**
 * @template [K = unknown]
 * @template {object} [V = object]
 */
export class WeakValueMap {
	/**
	 * Similar to `WeakMap` except instead of a weakly held key, it's the value that is weakly held.
	 * As a result, you can use primitives as keys.
	 * @param {Iterable<[K, V]>} iterable
	 */
	constructor(iterable = []) {
		/** @private @type {Map<K, WeakRef<V>>} */
		this._map = new Map();

		/** @private @type {FinalizationRegistry<K>} */
		this._finalizationRegistry = new FinalizationRegistry((key) => {
			this._map.delete(key);
		});

		for (const [key, value] of iterable) {
			this.set(key, value);
		}
	}

	/**
	 * @param {K} key
	 * @param {V} value
	 */
	set(key, value) {
		const currentRef = this.get(key);
		if (currentRef) {
			this._finalizationRegistry.unregister(currentRef);
		}
		this._finalizationRegistry.register(value, key, value);
		this._map.set(key, new WeakRef(value));
	}

	/**
	 * @param {K} key
	 */
	get(key) {
		const weakRef = this._map.get(key);
		if (!weakRef) return;
		const ref = weakRef.deref();
		if (!ref) {
			this._map.delete(key);
			return;
		}
		return ref;
	}

	/**
	 * @param {K} key
	 */
	has(key) {
		return Boolean(this.get(key));
	}

	/**
	 * @param {K} key
	 */
	delete(key) {
		const ref = this.get(key);
		if (ref) {
			this._finalizationRegistry.unregister(ref);
		}
		this._map.delete(key);
	}
}
