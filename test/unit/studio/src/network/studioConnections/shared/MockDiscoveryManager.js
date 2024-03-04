import { assertEquals } from "std/testing/asserts.ts";
import { DiscoveryManager as RealDiscoveryManager } from "../../../../../../../src/network/studioConnections/DiscoveryManager.js";

/** @type {Set<DiscoveryManager>} */
const createdDiscoveryManagers = new Set();

export function *getCreatedDiscoveryManagers() {
	yield* createdDiscoveryManagers;
}

export function clearCreatedDiscoveryManagers() {
	createdDiscoveryManagers.clear();
}

/**
 * Asserts that the specified amount of discovery managers was created and returns the last one.
 * @param {number} length
 */
export function assertLastDiscoveryManager(length = 1) {
	const discoveryManagers = Array.from(getCreatedDiscoveryManagers());
	assertEquals(discoveryManagers.length, length);
	return discoveryManagers[length - 1];
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
		this.destructed = false;

		createdDiscoveryManagers.add(this);
	}

	destructor() {
		this.destructed = true;
		super.destructor();
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
