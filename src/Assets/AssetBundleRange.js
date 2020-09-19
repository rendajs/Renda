export default class AssetBundleRange{
	constructor({
		typeUuid = null,
		byteStart = 0,
		byteEnd = 0,
	} = {}){
		this.typeUuid = typeUuid;
		this.byteStart = byteStart;
		this.byteEnd = byteEnd;
	}
}
