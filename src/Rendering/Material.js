export default class Material{
	constructor({
		customMapDatas = new Map(),
	} = {}){
		this.customMapDatas = customMapDatas;

		this.disposed = false;
	}

	destructor(){
		//todo: keep track of used renderers and let then know to dispose this material
	}

	markDisposed(){
		this.disposed = true;
		this.customMapDatas = null;
	}
}
