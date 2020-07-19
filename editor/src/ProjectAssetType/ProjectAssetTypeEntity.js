import ProjectAssetType from "./ProjectAssetType.js";
import {Entity} from "../../../src/index.js";

export default class ProjectAssetTypeEntity extends ProjectAssetType{

	static type = "entity";
	static newFileName = "New Entity";

	constructor(){
		super();
	}

	static createNewFile(){
		const entity = new Entity("New Entity");
		return entity.toJson();
	}
}
