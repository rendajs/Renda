import { AssetBundleRange } from "./DownloadableAssetBundleRange.js";
import { SingleInstancePromise } from "../../util/SingleInstancePromise.js";
import { PromiseWaitHelper } from "../../util/PromiseWaitHelper.js";
import { streamAsyncIterator } from "../../util/util.js";
import { binaryToUuid } from "../../util/binarySerialization.js";
import { AssetBundle } from "./AssetBundle.js";

/** @typedef {(progress: number) => void} OnProgressCallback */

/**
 * A DownloadableAssetBundle fetches a single bundle from a url, providing an AssetLoader with the assets from the url.
 * An asset bundle file is typically generated using a 'bundle assets' task in Renda Studio.
 */
export class DownloadableAssetBundle extends AssetBundle {
	/**
	 * Creates a new DownloadableAssetBundle.
	 *
	 * @example
	 * ```js
	 * const loader = new AssetLoader();
	 * const bundle = loader.addBundle(new DownloadableAssetBundle());
	 * await bundle.startDownload();
	 * const asset = loader.getAsset(assetUuid);
	 * ```
	 * @param {string} url
	 */
	constructor(url) {
		super();
		this.url = url;

		/** @private @type {Map<import("../../mod.js").UuidString, AssetBundleRange>} */
		this.assetRanges = new Map();
		this.progress = 0;
		/** @private @type {Set<OnProgressCallback>} */
		this.onProgressCbs = new Set();

		this.downloadInstance = new SingleInstancePromise(async () => await this.downloadLogic(), { once: true });
		this.headerWait = new PromiseWaitHelper();

		this.downloadBuffer = null;
	}

	async startDownload() {
		await this.downloadInstance.run();
	}

	async waitForLoad() {
		await this.downloadInstance.waitForFinishOnce();
	}

	/**
	 * @private
	 */
	async downloadLogic() {
		const response = await fetch(this.url);
		// TODO: #746 don't use content-length header
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
					this.assetRanges.set(uuid, new AssetBundleRange({ typeUuid, byteStart, byteEnd }));
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

	/**
	 * @private
	 */
	async waitForHeader() {
		await this.headerWait.wait();
	}

	/**
	 * @override
	 * @param {import("../../util/util.js").UuidString} uuid
	 */
	async hasAsset(uuid) {
		await this.waitForHeader();
		const range = this.assetRanges.get(uuid);
		return !!range;
	}

	/**
	 * @override
	 * @param {import("../../util/util.js").UuidString} uuid
	 */
	async waitForAssetAvailable(uuid) {
		await this.waitForHeader();
		const range = this.assetRanges.get(uuid);
		if (!range) return false;

		await range.waitForAvailable();
		return true;
	}

	/**
	 * @param {import("../../util/util.js").UuidString} uuid
	 */
	async getAsset(uuid) {
		const exists = await this.waitForAssetAvailable(uuid);
		if (!exists) return null;

		const range = this.assetRanges.get(uuid);
		if (!range) throw new Error("Assertion failed, asset range does not exist");
		if (!this.downloadBuffer) throw new Error("Assertion failed, downloadbuffer is null");
		const buffer = this.downloadBuffer.slice(range.byteStart, range.byteEnd);
		const type = range.typeUuid;
		return { buffer, type };
	}
}
