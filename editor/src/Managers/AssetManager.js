import {GameObject} from "../../../src/index.js";

export default class AssetManager{
	constructor(){

	}

	destructor(){

	}

	createObjectFromJsonData(jsonData){
		let obj = new GameObject(jsonData.name || "");
		for(const childJson of (jsonData.children || [])){
			let child = this.createObjectFromJsonData(childJson);
			obj.add(child);
		}
		return obj;
	}
}
