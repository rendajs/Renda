import PromiseWaitHelper from "../Util/PromiseWaitHelper.js";

export default class AssetBundleRange{
	constructor({
		typeUuid = null,
		byteStart = 0,
		byteEnd = 0,
	} = {}){
		this.typeUuid = typeUuid;
		this.byteStart = byteStart;
		this.byteEnd = byteEnd;

		this.availableWait = new PromiseWaitHelper();
	}

	bundleDataReceived(length){
		if(length >= this.byteEnd){
			this.availableWait.fire();
		}
	}

	async waitForAvailable(){
		await this.availableWait.wait();
	}
}
