import {AssetBundleRange} from "./AssetBundleRange.js";
import {SingleInstancePromise} from "../util/SingleInstancePromise.js";
import {PromiseWaitHelper} from "../util/PromiseWaitHelper.js";
import {streamAsyncIterator} from "../util/mod.js";
import {BinaryDecomposer} from "../util/BinaryDecomposer.js";

export class AssetBundle {
	constructor(url) {
		this.url = url;

		this.assetRanges = new Map();
		this.progress = 0;
		this.onProgressCbs = new Set();

		this.downloadInstance = new SingleInstancePromise(async () => await this.downloadLogic());
		this.headerWait = new PromiseWaitHelper();

		this.downloadBuffer = null;
	}

	async startDownload() {
		await this.downloadInstance.run();
	}

	async waitForLoad() {
		await this.downloadInstance.waitForFinish();
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
					const uuid = BinaryDecomposer.binaryToUuid(allChunks.buffer, headerCursor);
					headerCursor += 16;

					const typeUuid = BinaryDecomposer.binaryToUuid(allChunks.buffer, headerCursor);
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

	onProgress(cb) {
		this.onProgressCbs.add(cb);
	}

	async waitForHeader() {
		await this.headerWait.wait();
	}

	async hasAsset(uuid) {
		await this.waitForHeader();
		const range = this.assetRanges.get(uuid);
		return !!range;
	}

	async waitForAssetAvailable(uuid) {
		await this.waitForHeader();
		const range = this.assetRanges.get(uuid);
		if (!range) return false;

		await range.waitForAvailable();
		return true;
	}

	async getAsset(uuid) {
		const exists = await this.hasAsset(uuid);
		if (!exists) return null;

		const range = this.assetRanges.get(uuid);
		const buffer = this.downloadBuffer.slice(range.byteStart, range.byteEnd);
		const type = range.typeUuid;
		return {buffer, type};
	}
}
