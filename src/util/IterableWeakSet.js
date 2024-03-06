/**
 * @template {object} [T = never]
 */
export class IterableWeakSet {
	/**
	 * @param {Iterable<T>} [iterable]
	 */
	constructor(iterable) {
		/** @private @type {Set<WeakRef<T>>} */
		this._items = new Set();
		if (iterable) {
			for (const item of iterable) {
				this.add(item);
			}
		}
	}

	/**
	 * @param {T} item
	 */
	add(item) {
		if (this.has(item)) return;
		this._items.add(new WeakRef(item));
	}

	/**
	 * @param {T} item
	 */
	has(item) {
		for (const ref of this) {
			if (ref === item) return true;
		}
		return false;
	}

	/**
	 * @param {T} item
	 */
	delete(item) {
		for (const { ref, weakRef } of this._yieldWeakRefs()) {
			if (item === ref) {
				this._items.delete(weakRef);
			}
		}
	}

	/**
	 * Iterates over the items will simultaneously removing old items.
	 * @private
	 */
	*_yieldWeakRefs() {
		for (const weakRef of this._items) {
			const ref = weakRef.deref();
			if (!ref) {
				this._items.delete(weakRef);
				continue;
			}
			yield { ref, weakRef };
		}
	}

	*[Symbol.iterator]() {
		for (const { ref } of this._yieldWeakRefs()) {
			yield ref;
		}
	}

	get size() {
		return Array.from(this._yieldWeakRefs()).length;
	}
}
