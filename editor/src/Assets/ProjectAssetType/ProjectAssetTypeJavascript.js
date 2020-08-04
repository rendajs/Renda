import ProjectAssetType from "./ProjectAssetType.js";
import {Mesh, Vector3} from "../../../../src/index.js";

export default class ProjectAssetTypeJavascript extends ProjectAssetType{

	static type = "javascript";
	static newFileName = "New Script";
	static newFileExtension = "js";
	static storeInProjectAsJson = false;

	constructor(){
		super(...arguments);
	}

	static createNewFile(){
		return `import JJ from "JJ";

export default class NewClass{
	constructor(){

	}
}"`;
	}
}
