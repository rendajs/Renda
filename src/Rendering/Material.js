import {MaterialMap} from "./MaterialMap.js";

export class Material {
	/**
	 * @param {MaterialMap} materialMap
	 */
	constructor(materialMap) {
		this.materialMap = materialMap;
		this.onDestructorCbs = new Set();

		this.destructed = false;
	}

	destructor() {
		for (const cb of this.onDestructorCbs) {
			cb();
		}
		this.onDestructorCbs.clear();

		this.destructed = true;
	}

	onDestructor(cb) {
		this.onDestructorCbs.add(cb);
	}

	removeOnDestructor(cb) {
		this.onDestructorCbs.delete(cb);
	}
}
