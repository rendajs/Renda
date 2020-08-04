import ProjectAssetType from "./ProjectAssetType.js";
import PropertiesAssetContentJavascript from "../../PropertiesAssetContent/PropertiesAssetContentJavascript.js";

export default class ProjectAssetTypeJavascript extends ProjectAssetType{

	static type = "javascript";
	static newFileName = "New Script";
	static newFileExtension = "js";
	static storeInProjectAsJson = false;
	static propertiesAssetContentConstructor = PropertiesAssetContentJavascript;

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
