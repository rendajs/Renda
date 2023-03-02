import {AssetBundleRange} from "./AssetBundleRange.js";
import {SingleInstancePromise} from "../util/SingleInstancePromise.js";
import {PromiseWaitHelper} from "../util/PromiseWaitHelper.js";
import {streamAsyncIterator} from "../util/util.js";
import {binaryToUuid} from "../util/binarySerialization.js";

/** @typedef {(progress: number) => void} OnProgressCallback */

export class AssetBundle {
	/**
	 * @param {string} url
	 */
	constructor(url) {
		this.url = url;

		/** @type {Map<import("../mod.js").UuidString, AssetBundleRange>} */
		this.assetRanges = new Map();
		this.progress = 0;
		/** @type {Set<OnProgressCallback>} */
		this.onProgressCbs = new Set();

		this.downloadInstance = new SingleInstancePromise(async () => await this.downloadLogic(), {once: true});
		this.headerWait = new PromiseWaitHelper();

		this.downloadBuffer = null;
	}

	async startDownload() {
		await this.downloadInstance.run();
	}

	async waitForLoad() {
		await this.downloadInstance.waitForFinishOnce();
	}

	async downloadLogic() {
		const response = await fetch(this.url);
		const contentLength = Number(response.headers.get("Content-Length"));
		let receivedLength = 0;
		const allChunks = new Uint8Array(contentLength);
		this.downloadBuffer = allChunks.buffer;
		const bundleDataView = new DataView(allChunks.buffer);

		let hasParsedAssetCount = false;
		let assetCount = 0;
		let headerLength = 0;

		let hasParsedHeader = false;

		// TODO: better error handling when fetch fails
		if (!response.body) return;

		// todo: use for await here once it's implemented in most browsers
		for await (const chunk of streamAsyncIterator(response.body)) {
			allChunks.set(chunk, receivedLength);
			receivedLength += chunk.length;

			// parse asset count
			if (!hasParsedAssetCount && receivedLength >= 4) {
				hasParsedAssetCount = true;
				assetCount = bundleDataView.getUint32(0, true);
				const assetHeaderByteLength = 16 + 16 + 4; // 16 bytes for the uuid + 16 bytes for the asset type uuid + 4 bytes for the asset length
				headerLength = 4 + assetCount * assetHeaderByteLength;
			}

			// parse header
			if (hasParsedAssetCount && !hasParsedHeader && receivedLength >= headerLength) {
				hasParsedHeader = true;
				let headerCursor = 4;
				let prevAssetByteEnd = headerLength;
				while (headerCursor < headerLength) {
					const uuid = binaryToUuid(allChunks.buffer, headerCursor);
					if (!uuid) throw new Error("Failed to parse asset uuid, uuid is null.");
					headerCursor += 16;

					const typeUuid = binaryToUuid(allChunks.buffer, headerCursor);
					if (!typeUuid) throw new Error("Failed to parse asset type uuid, uuid is null.");
					headerCursor += 16;

					const assetSize = bundleDataView.getUint32(headerCursor, true);
					headerCursor += 4;

					const byteStart = prevAssetByteEnd;
					const byteEnd = prevAssetByteEnd + assetSize;
					prevAssetByteEnd = byteEnd;
					this.assetRanges.set(uuid, new AssetBundleRange({typeUuid, byteStart, byteEnd}));
				}
				this.headerWait.fire();
			}

			if (hasParsedHeader) {
				for (const range of this.assetRanges.values()) {
					range.bundleDataReceived(receivedLength);
				}
			}

			this.progress = receivedLength / contentLength;
			for (const cb of this.onProgressCbs) {
				cb(this.progress);
			}
		}
	}

	/**
	 * @param {OnProgressCallback} cb
	 */
	onProgress(cb) {
		this.onProgressCbs.add(cb);
	}

	async waitForHeader() {
		await this.headerWait.wait();
	}

	/**
	 * @param {import("../util/util.js").UuidString} uuid
	 */
	async hasAsset(uuid) {
		await this.waitForHeader();
		const range = this.assetRanges.get(uuid);
		return !!range;
	}

	/**
	 * @param {import("../util/util.js").UuidString} uuid
	 */
	async waitForAssetAvailable(uuid) {
		await this.waitForHeader();
		const range = this.assetRanges.get(uuid);
		if (!range) return false;

		await range.waitForAvailable();
		return true;
	}

	/**
	 * @param {import("../util/util.js").UuidString} uuid
	 */
	async getAsset(uuid) {
		if (!this.downloadBuffer) return null;
		const exists = await this.hasAsset(uuid);
		if (!exists) return null;

		const range = this.assetRanges.get(uuid);
		if (!range) throw new Error("Assertion failed, asset range does not exist");
		const buffer = this.downloadBuffer.slice(range.byteStart, range.byteEnd);
		const type = range.typeUuid;
		return {buffer, type};
	}
}
