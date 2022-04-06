import {PromiseWaitHelper} from "../util/PromiseWaitHelper.js";

export class AssetBundleRange {
	constructor({
		typeUuid = null,
		byteStart = 0,
		byteEnd = 0,
	} = {}) {
		this.typeUuid = typeUuid;
		this.byteStart = byteStart;
		this.byteEnd = byteEnd;

		this.availableWait = new PromiseWaitHelper();
	}

	/**
	 * @param {number} length
	 */
	bundleDataReceived(length) {
		if (length >= this.byteEnd) {
			this.availableWait.fire();
		}
	}

	async waitForAvailable() {
		await this.availableWait.wait();
	}
}
