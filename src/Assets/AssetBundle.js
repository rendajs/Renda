import SingleInstancePromise from "../Util/SingleInstancePromise.js";

export default class AssetBundle{
	constructor(url){
		this.url = url;

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
		//todo: use for await here once it's implemented in most browsers
		const reader = response.body.getReader();
		let receivedLength = 0;
		while(true){
			const {value, done} = await reader.read();
			if(done) break;

			receivedLength += value.length;
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
