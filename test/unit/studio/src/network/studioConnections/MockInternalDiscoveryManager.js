export class MockInternalDiscoveryManager {
	/** @param {ConstructorParameters<typeof import("../../../../../../src/mod.js").InternalDiscoveryManager>} args */
	constructor(...args) {
		this.constructorArgs = args;
	}

	/** @type {Set<import("../../../../../../src/inspector/InternalDiscoveryManager.js").OnConnectionCreatedCallback>} */
	#onConnectionCreatedCbs = new Set();

	/** @type {import("../../../../../../src/mod.js").InternalDiscoveryManager["onConnectionCreated"]} */
	onConnectionCreated(cb) {
		this.#onConnectionCreatedCbs.add(cb);
	}

	/**
	 * @param {Parameters<import("../../../../../../src/inspector/InternalDiscoveryManager.js").OnConnectionCreatedCallback>} args
	 */
	fireConnectionCreated(...args) {
		this.#onConnectionCreatedCbs.forEach(cb => cb(...args));
	}

	/** @type {Set<import("../../../../../../src/inspector/InternalDiscoveryManager.js").OnAvailableClientUpdateCallback>} */
	#onAvailableClientUpdatedCbs = new Set();

	/** @type {import("../../../../../../src/mod.js").InternalDiscoveryManager["onAvailableClientUpdated"]} */
	onAvailableClientUpdated(cb) {
		this.#onAvailableClientUpdatedCbs.add(cb);
	}

	/**
	 * @param {Parameters<import("../../../../../../src/inspector/InternalDiscoveryManager.js").OnAvailableClientUpdateCallback>} args
	 */
	fireOnAvailableClientUpdated(...args) {
		this.#onAvailableClientUpdatedCbs.forEach(cb => cb(...args));
	}

	registerClient() {}
	sendProjectMetaData() {}
	destructor() {}
}

export {MockInternalDiscoveryManager as InternalDiscoveryManager};
