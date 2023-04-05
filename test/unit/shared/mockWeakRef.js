const originalFinalizationRegistry = globalThis.FinalizationRegistry;
const originalWeakRef = globalThis.WeakRef;
const originalWeakMap = globalThis.WeakMap;

/**
 * A collection of objects that have been registered with a FinalizationRegistry.
 * WeakMaps, WeakSets, and WeakRefs are not included in this collection.
 * @type {Map<object, RegistryItem>}
 */
const registry = new Map();

/**
 * @typedef RegisteredWeakRef
 * @property {object} target
 */

/**
 * A collection of objects that have been registered with a WeakMap, WeakSet or WeakRef.
 * @type {Set<RegisteredWeakRef>}
 */
const registeredWeakRefs = new Set();

class RegistryItem {
	/**
	 * @param {any} heldValue
	 * @param {object | undefined} unregisterToken
	 */
	constructor(heldValue, unregisterToken) {
		this.heldValue = heldValue;
		this.unregisterToken = unregisterToken;
		/** @type {Set<() => void>} */
		this.onCleanupCbs = new Set();
	}

	forceCleanup() {
		this.onCleanupCbs.forEach(cb => cb());
	}

	/**
	 * @param {() => void} cb
	 */
	onCleanup(cb) {
		this.onCleanupCbs.add(cb);
	}
}

class MockFinalizationRegistry {
	/** @type {(heldValue: any) => void} */
	#cleanupCallback;

	/**
	 * @param {(heldValue: any) => void} cleanupCallback
	 */
	constructor(cleanupCallback) {
		this.#cleanupCallback = cleanupCallback;
	}

	/**
	 * @param {object} target
	 * @param {any} heldValue
	 * @param {object} [unregisterToken]
	 */
	register(target, heldValue, unregisterToken) {
		const item = new RegistryItem(heldValue, unregisterToken);
		registry.set(target, item);
		item.onCleanup(() => {
			this.#cleanupCallback(item.heldValue);
		});
	}

	/**
	 * @param {object} unregisterToken
	 */
	unregister(unregisterToken) {
		if (!unregisterToken) return;
		for (const [target, item] of registry) {
			if (item.unregisterToken == unregisterToken) {
				registry.delete(target);
			}
		}
	}
}

class MockWeakRef {
	#target;
	#registeredWeakRef;

	/**
	 * @param {object} target
	 */
	constructor(target) {
		this.#target = target;
		this.#registeredWeakRef = {target};
		registeredWeakRefs.add(this.#registeredWeakRef);
	}

	deref() {
		if (registeredWeakRefs.has(this.#registeredWeakRef)) {
			return this.#target;
		}
		return undefined;
	}
}

class MockWeakMap {
	/** @type {Map<object, {value: any, registeredWeakRef: RegisteredWeakRef}>} */
	#map = new Map();

	/**
	 * @param {readonly [object, any][]} iterable
	 */
	constructor(iterable = []) {
		for (const [key, value] of iterable) {
			this.set(key, value);
		}
	}

	/**
	 * @param {object} key
	 * @param {any} value
	 */
	set(key, value) {
		const registeredWeakRef = {target: key};
		registeredWeakRefs.add(registeredWeakRef);
		this.#map.set(key, {value, registeredWeakRef});
	}

	/**
	 * @param {object} key
	 */
	get(key) {
		const item = this.#map.get(key);
		if (item && registeredWeakRefs.has(item.registeredWeakRef)) {
			return item.value;
		}
		return undefined;
	}

	/**
	 * @param {object} key
	 */
	has(key) {
		if (!this.#map.has(key)) return false;
		const item = this.#map.get(key);
		if (item) {
			return registeredWeakRefs.has(item.registeredWeakRef);
		}
		return false;
	}

	/**
	 * @param {object} key
	 */
	delete(key) {
		const item = this.#map.get(key);
		if (item) {
			registeredWeakRefs.delete(item.registeredWeakRef);
		}
		this.#map.delete(key);
	}
}

export function installMockWeakRef() {
	globalThis.FinalizationRegistry = /** @type {any} */ (MockFinalizationRegistry);
	globalThis.WeakRef = /** @type {any} */ (MockWeakRef);
	globalThis.WeakMap = /** @type {any} */ (MockWeakMap);
}

export function uninstallMockWeakRef() {
	globalThis.FinalizationRegistry = originalFinalizationRegistry;
	globalThis.WeakRef = originalWeakRef;
	globalThis.WeakMap = originalWeakMap;
}

/**
 * @param {any} target
 */
export function forceCleanup(target) {
	const item = registry.get(target);
	if (item) item.forceCleanup();

	for (const weakRef of registeredWeakRefs) {
		if (weakRef.target == target) {
			registeredWeakRefs.delete(weakRef);
		}
	}
}
