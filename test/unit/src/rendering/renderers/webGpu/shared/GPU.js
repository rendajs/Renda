import { GPUAdapter } from "./GPUAdapter.js";

export class GPU {
	/** @type {GPUAdapter[]} */
	#createdAdapters = [];
	#mockAdapterEnabled = true;

	async requestAdapter() {
		if (!this.#mockAdapterEnabled) return null;
		const adapter = new GPUAdapter();
		this.#createdAdapters.push(adapter);
		return adapter;
	}

	/**
	 * Asserts that {@linkcode requestAdapter} has been called exactly once and returns the created mock adapter.
	 */
	assertHasSingleAdapter() {
		if (this.#createdAdapters.length != 1) {
			throw new Error("Expected there to be exactly one gpu adapter");
		}
		return this.#createdAdapters[0];
	}

	/**
	 * Asserts that both a single adapter and a single device have been created and returns the mock gpu device.
	 */
	assertHasSingleDevice() {
		const adapter = this.assertHasSingleAdapter();
		return adapter.assertHasSingleDevice();
	}

	/**
	 * Sets whether {@linkcode requestAdapter} returns an adapter or `null`.
	 * @param {boolean} enabled
	 */
	setMockAdapterEnabled(enabled) {
		this.#mockAdapterEnabled = enabled;
	}
}
