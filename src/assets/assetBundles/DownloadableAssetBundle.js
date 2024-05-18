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
	#url;
	get url() {
		return this.#url;
	}

	/** @type {ArrayBuffer?} */
	#downloadBuffer = null;

	#downloadInstance;
	/** @type {Set<OnProgressCallback>} */
	#onProgressCbs = new Set();
	#progress = 0;
	get progress() {
		return this.#progress;
	}

	/** @type {Map<import("../../mod.js").UuidString, AssetBundleRange>} */
	#assetRanges = new Map();

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
		this.#url = url;

		this.#downloadInstance = new SingleInstancePromise(async () => await this.#downloadLogic(), { once: true });
		this.headerWait = new PromiseWaitHelper();
	}

	async startDownload() {
		await this.#downloadInstance.run();
	}

	async waitForLoad() {
		await this.#downloadInstance.waitForFinishOnce();
	}

	async #downloadLogic() {
		const response = await fetch(this.#url);
		let receivedLength = 0;

		if (!response.ok) {
			throw new Error(`Asset bundle request responded with ${response.status} ${response.statusText}`);
		}

		if (!response.body) {
			throw new Error("Asset bundle request did not respond with any content");
		}

		// These values will be set once the content length is known
		/** @type {Uint8Array?} */
		let allChunks = null;
		/** @type {DataView?} */
		let bundleDataView = null;
		/** @type {number?} */
		let totalBundleSize = null;

		let hasParsedAssetCount = false;
		let assetCount = 0;
		let headerLength = 0;

		let hasParsedHeader = false;

		/**
		 * Chunks that have been received before the bundle size was known.
		 * These will be placed into {@linkcode allChunks} once the size is known.
		 * @type {Uint8Array[]}
		 */
		const unparsedChunks = [];

		// todo: use for await here once it's implemented in most browsers
		for await (const chunk of streamAsyncIterator(response.body)) {
			if (allChunks) {
				allChunks.set(chunk, receivedLength);
			}
			receivedLength += chunk.length;

			if (!allChunks) {
				unparsedChunks.push(chunk);
				const requiredSize = 16;
				if (receivedLength >= requiredSize) {
					const temporaryAllChunks = new Uint8Array(requiredSize);
					let i = 0;
					for (const chunk of unparsedChunks) {
						temporaryAllChunks.set(chunk.subarray(0, requiredSize - i), i);
						i += chunk.byteLength;
					}
					const temporaryDataView = new DataView(temporaryAllChunks.buffer);

					const magic = temporaryDataView.getUint32(0, true);
					if (magic != 0x62734172) {
						throw new Error(`Asset bundle request did not respond with the correct magic header. The url you provided (${this.#url}) does not point to an asset bundle.`);
					}

					const version = temporaryDataView.getUint32(4, true);
					if (version != 1) {
						throw new Error(`Asset bundle request responded with a future asset bundle version (${version}). This version of Renda only supports asset bundle version 1.`);
					}

					totalBundleSize = Number(temporaryDataView.getBigUint64(8, true));
					allChunks = new Uint8Array(totalBundleSize);
					bundleDataView = new DataView(allChunks.buffer);
					this.#downloadBuffer = allChunks.buffer;

					let j = 0;
					for (const chunk of unparsedChunks) {
						allChunks.set(chunk, j);
						j += chunk.byteLength;
					}
				}
			}

			if (!allChunks || !bundleDataView || totalBundleSize == null) continue;

			// parse asset count
			if (!hasParsedAssetCount && receivedLength >= 24) {
				hasParsedAssetCount = true;
				assetCount = Number(bundleDataView.getBigUint64(16, true));

				// 16 bytes for the uuid
				// + 16 bytes for the asset type uuid
				// + 8 bytes for the asset length
				const assetHeaderByteLength = 16 + 16 + 8;

				// 4 bytes for the magic header 'rAsb'
				// + 4 bytes for the version
				// + 8 bytes for the total length of the bundle
				// + 8 bytes for the asset count
				// + the asset headers
				headerLength = 4 + 4 + 8 + 8 + assetCount * assetHeaderByteLength;
			}

			// parse header
			if (hasParsedAssetCount && !hasParsedHeader && receivedLength >= headerLength) {
				hasParsedHeader = true;
				let headerCursor = 24;
				let prevAssetByteEnd = headerLength;
				while (headerCursor < headerLength) {
					const uuid = binaryToUuid(allChunks.buffer, headerCursor);
					if (!uuid) throw new Error("Failed to parse asset uuid, uuid is null.");
					headerCursor += 16;

					const typeUuid = binaryToUuid(allChunks.buffer, headerCursor);
					if (!typeUuid) throw new Error("Failed to parse asset type uuid, uuid is null.");
					headerCursor += 16;

					const assetSize = Number(bundleDataView.getBigUint64(headerCursor, true));
					headerCursor += 8;

					const byteStart = prevAssetByteEnd;
					const byteEnd = prevAssetByteEnd + assetSize;
					prevAssetByteEnd = byteEnd;
					this.#assetRanges.set(uuid, new AssetBundleRange({ typeUuid, byteStart, byteEnd }));
				}
				this.headerWait.fire();
			}

			if (hasParsedHeader) {
				for (const range of this.#assetRanges.values()) {
					range.bundleDataReceived(receivedLength);
				}
			}

			this.#progress = receivedLength / totalBundleSize;
			for (const cb of this.#onProgressCbs) {
				cb(this.#progress);
			}
		}
	}

	/**
	 * @param {OnProgressCallback} cb
	 */
	onProgress(cb) {
		this.#onProgressCbs.add(cb);
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
		const range = this.#assetRanges.get(uuid);
		return !!range;
	}

	/**
	 * @override
	 * @param {import("../../util/util.js").UuidString} uuid
	 */
	async waitForAssetAvailable(uuid) {
		await this.waitForHeader();
		const range = this.#assetRanges.get(uuid);
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

		const range = this.#assetRanges.get(uuid);
		if (!range) throw new Error("Assertion failed, asset range does not exist");
		if (!this.#downloadBuffer) throw new Error("Assertion failed, downloadbuffer is null");
		const buffer = this.#downloadBuffer.slice(range.byteStart, range.byteEnd);
		const type = range.typeUuid;
		return { buffer, type };
	}
}
