import {PromiseWaitHelper} from "../util/PromiseWaitHelper.js";

export class AssetBundleRange {
	/**
	 * @param {object} options
	 * @param {import("../util/util.js").UuidString} options.typeUuid
	 * @param {number} options.byteStart
	 * @param {number} options.byteEnd
	 */
	constructor({typeUuid, byteStart, byteEnd}) {
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
