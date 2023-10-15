export class MockInternalDiscoveryManager {
	/** @param {ConstructorParameters<typeof import("../../../../../../src/network/studioConnections/discoveryManagers/DiscoveryManagerInternal.js").DiscoveryManagerInternal>} args */
	constructor(...args) {
		this.constructorArgs = args;
	}

	/** @type {Set<import("../../../../../../src/network/studioConnections/discoveryManagers/DiscoveryManagerInternal.js").OnConnectionCreatedCallback>} */
	#onConnectionCreatedCbs = new Set();

	/** @type {import("../../../../../../src/network/studioConnections/discoveryManagers/DiscoveryManagerInternal.js").DiscoveryManagerInternal["onConnectionCreated"]} */
	onConnectionCreated(cb) {
		this.#onConnectionCreatedCbs.add(cb);
	}

	/**
	 * @param {Parameters<import("../../../../../../src/network/studioConnections/discoveryManagers/DiscoveryManagerInternal.js").OnConnectionCreatedCallback>} args
	 */
	fireConnectionCreated(...args) {
		this.#onConnectionCreatedCbs.forEach(cb => cb(...args));
	}

	/** @type {Set<import("../../../../../../src/network/studioConnections/discoveryManagers/DiscoveryManagerInternal.js").OnAvailableClientUpdateCallback>} */
	#onAvailableClientUpdatedCbs = new Set();

	/** @type {import("../../../../../../src/network/studioConnections/discoveryManagers/DiscoveryManagerInternal.js").DiscoveryManagerInternal["onAvailableClientUpdated"]} */
	onAvailableClientUpdated(cb) {
		this.#onAvailableClientUpdatedCbs.add(cb);
	}

	/**
	 * @param {Parameters<import("../../../../../../src/network/studioConnections/discoveryManagers/DiscoveryManagerInternal.js").OnAvailableClientUpdateCallback>} args
	 */
	fireOnAvailableClientUpdated(...args) {
		this.#onAvailableClientUpdatedCbs.forEach(cb => cb(...args));
	}

	registerClient() {}
	sendProjectMetaData() {}
	destructor() {}
}

export {MockInternalDiscoveryManager as InternalDiscoveryManager};
