import ProjectAssetType from "./ProjectAssetType.js";

export default class ProjectAssetTypeJavascript extends ProjectAssetType{

	static type = "javascript";
	static newFileName = "New Script";
	static newFileExtension = "js";
	static storeInProjectAsJson = false;

	static assetSettingsStructure = {
		outputLocation: {
			label: "Build output location",
			type: "string",
		},
	};

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
