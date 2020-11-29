export default class Material{
	constructor({
		customMapDatas = new Map(),
	} = {}){
		this.customMapDatas = customMapDatas;
		this.onDestructorCbs = new Set();

		this.destructed = false;
	}

	destructor(){
		for(const cb of this.onDestructorCbs){
			cb();
		}
		this.onDestructorCbs.clear();

		this.customMapDatas = null;
		this.destructed = true;
	}

	onDestructor(cb){
		this.onDestructorCbs.add(cb);
	}

	removeOnDestructor(cb){
		this.onDestructorCbs.delete(cb);
	}
}
