import AssetBundleRange from "./AssetBundleRange.js";
import SingleInstancePromise from "../Util/SingleInstancePromise.js";
import {streamAsyncIterator, binaryToUuid} from "../Util/Util.js";

export default class AssetBundle{
	constructor(url){
		this.url = url;

		this.assets = new Map();
		this.progress = 0;
		this.onProgressCbs = new Set();

		this.downloadInstance = new SingleInstancePromise(async _ => await this.downloadLogic());
	}

	async startDownload(){
		await this.downloadInstance.run();
	}

	async waitForLoad(){
		await this.downloadInstance.waitForFinish();
	}

	async downloadLogic(){
		const response = await fetch(this.url);
		const contentLength = +response.headers.get("Content-Length");
		let receivedLength = 0;
		const allChunks = new Uint8Array(contentLength);
		const bundleDataView = new DataView(allChunks.buffer);

		let hasReceivedAssetCount = false;
		let assetCount = 0;
		let headerLength = 0;

		let hasReceivedHeader = false;

		//todo: use for await here once it's implemented in most browsers
		for await(const chunk of streamAsyncIterator(response.body)){
			allChunks.set(chunk, receivedLength);
			receivedLength += chunk.length;

			//parse asset count
			if(!hasReceivedAssetCount && receivedLength >= 4){
				hasReceivedAssetCount = true;
				assetCount = bundleDataView.getUint32(0, true);
				const assetHeaderByteLength = 16 + 16 + 4; //16 bytes for the uuid + 16 bytes for the asset type uuid + 4 bytes for the asset length
				headerLength = 4 + assetCount * assetHeaderByteLength;
			}

			//parse header
			if(hasReceivedAssetCount && !hasReceivedHeader && receivedLength >= headerLength){
				hasReceivedHeader = true;
				let headerCursor=4;
				let prevAssetByteEnd = headerLength;
				while(headerCursor < headerLength){
					const uuid = binaryToUuid(allChunks.buffer, headerCursor);
					headerCursor += 16;

					const typeUuid = binaryToUuid(allChunks.buffer, headerCursor);
					headerCursor += 16;

					const assetSize = bundleDataView.getUint32(headerCursor, true);
					headerCursor += 4;

					const byteStart = prevAssetByteEnd;
					const byteEnd = prevAssetByteEnd + assetSize;
					prevAssetByteEnd = byteEnd;
					this.assets.set(uuid, new AssetBundleRange({typeUuid, byteStart, byteEnd}));
				}
			}

			this.progress = receivedLength/contentLength;
			for(const cb of this.onProgressCbs){
				cb(this.progress);
			}
		}
	}

	onProgress(cb){
		this.onProgressCbs.add(cb);
	}
}
