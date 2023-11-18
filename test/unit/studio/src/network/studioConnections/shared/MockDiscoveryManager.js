import {DiscoveryManager as RealDiscoveryManager} from "../../../../../../../src/network/studioConnections/DiscoveryManager.js";

/** @type {Set<DiscoveryManager>} */
const createdDiscoveryManagers = new Set();

export function *getCreatedDiscoveryManagers() {
	yield* createdDiscoveryManagers;
}

export function clearCreatedDiscoveryManagers() {
	createdDiscoveryManagers.clear();
}

/**
 * @typedef MockDiscoveryManagerMethodData
 * @property {string} type
 */

export class DiscoveryManager extends RealDiscoveryManager {
	/**
	 * @param  {ConstructorParameters<typeof RealDiscoveryManager>} args
	 */
	constructor(...args) {
		super(...args);
		createdDiscoveryManagers.add(this);
	}

	getCreatedDiscoveryMethods() {
		const discoveryMethods = [];
		for (const method of this.discoveryMethods) {
			const castConstructor = /** @type {typeof import("../../../../../../../src/network/studioConnections/discoveryMethods/DiscoveryMethod.js").DiscoveryMethod} */ (method.constructor);
			discoveryMethods.push({
				type: castConstructor.type,
			});
		}
		return discoveryMethods;
	}
}
