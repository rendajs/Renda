export default class Material{
	constructor({
		customMapDatas = new Map(),
	} = {}){
		this.customMapDatas = customMapDatas;

		this.disposed = false;
	}

	markDisposed(){
		this.disposed = true;
		this.customMapDatas = null;
	}
}
