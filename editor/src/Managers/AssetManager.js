import {Entity} from "../../../src/index.js";

export default class AssetManager{
	constructor(){

	}

	destructor(){

	}

	createEntityFromJsonData(jsonData){
		let ent = new Entity(jsonData.name || "");
		for(const childJson of (jsonData.children || [])){
			let child = this.createEntityFromJsonData(childJson);
			ent.add(child);
		}
		return ent;
	}
}
