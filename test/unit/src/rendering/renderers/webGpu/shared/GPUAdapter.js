import {GPUDevice} from "./GPUDevice.js";

export class GPUAdapter {
	/** @type {GPUDevice[]} */
	#createdDevices = [];

	requestDevice() {
		const device = new GPUDevice();
		this.#createdDevices.push(device);
		return device;
	}

	assertHasSingleDevice() {
		if (this.#createdDevices.length != 1) {
			throw new Error("Expected there to be exactly one gpu device");
		}
		return this.#createdDevices[0];
	}
}
