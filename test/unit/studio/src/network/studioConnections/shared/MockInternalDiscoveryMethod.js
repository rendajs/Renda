import {ExtendedDiscoveryMethod} from "../../../../../src/network/studioConnections/discoveryMethods/shared/ExtendedDiscoveryMethod.js";

/** @type {Set<InternalDiscoveryMethod>} */
const createdDiscoveryMethods = new Set();

export function *getCreatedInternalDiscoveryMethods() {
	yield* createdDiscoveryMethods;
}

export function clearCreatedInternalDiscoveryMethods() {
	createdDiscoveryMethods.clear();
}

export class InternalDiscoveryMethod extends ExtendedDiscoveryMethod {
	static type = "renda:internal";

	/**
	 * @param {string} endpoint
	 */
	constructor(endpoint) {
		super();
		createdDiscoveryMethods.add(this);
		this.endpoint = endpoint;
	}

	getClientUuid() {
		return Promise.resolve("client uuid");
	}
}
