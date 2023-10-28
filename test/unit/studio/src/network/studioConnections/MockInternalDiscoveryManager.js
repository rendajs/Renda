export class MockInternalDiscoveryManager {
	/** @param {ConstructorParameters<typeof import("../../../../../../src/network/studioConnections/discoveryMethods/InternalDiscoveryMethod.js").InternalDiscoveryMethod>} args */
	constructor(...args) {
		this.constructorArgs = args;
	}

	/** @type {Set<import("../../../../../../src/network/studioConnections/discoveryMethods/InternalDiscoveryMethod.js").OnConnectionCreatedCallback>} */
	#onConnectionCreatedCbs = new Set();

	/** @type {import("../../../../../../src/network/studioConnections/discoveryMethods/InternalDiscoveryMethod.js").InternalDiscoveryMethod["onConnectionRequestCbs"]} */
	onConnectionCreated(cb) {
		this.#onConnectionCreatedCbs.add(cb);
	}

	/**
	 * @param {Parameters<import("../../../../../../src/network/studioConnections/discoveryMethods/InternalDiscoveryMethod.js").OnConnectionCreatedCallback>} args
	 */
	fireConnectionCreated(...args) {
		this.#onConnectionCreatedCbs.forEach(cb => cb(...args));
	}

	/** @type {Set<import("../../../../../../src/network/studioConnections/discoveryMethods/InternalDiscoveryMethod.js").OnAvailableClientUpdateCallback>} */
	#onAvailableClientUpdatedCbs = new Set();

	/** @type {import("../../../../../../src/network/studioConnections/discoveryMethods/InternalDiscoveryMethod.js").InternalDiscoveryMethod["onAvailableClientUpdated"]} */
	onAvailableClientUpdated(cb) {
		this.#onAvailableClientUpdatedCbs.add(cb);
	}

	/**
	 * @param {Parameters<import("../../../../../../src/network/studioConnections/discoveryMethods/InternalDiscoveryMethod.js").OnAvailableClientUpdateCallback>} args
	 */
	fireOnAvailableClientUpdated(...args) {
		this.#onAvailableClientUpdatedCbs.forEach(cb => cb(...args));
	}

	registerClient() {}
	sendProjectMetaData() {}
	destructor() {}
}

export {MockInternalDiscoveryManager as InternalDiscoveryManager};
