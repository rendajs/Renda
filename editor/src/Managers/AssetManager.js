import {Entity} from "../../../src/index.js";

export default class AssetManager{
	constructor(){

	}

	destructor(){

	}

	createEntityFromJsonData(jsonData){
		let obj = new Entity(jsonData.name || "");
		for(const childJson of (jsonData.children || [])){
			let child = this.createEntityFromJsonData(childJson);
			obj.add(child);
		}
		return obj;
	}
}
