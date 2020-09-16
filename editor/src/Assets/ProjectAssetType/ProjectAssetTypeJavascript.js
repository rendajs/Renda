import ProjectAssetType from "./ProjectAssetType.js";
import {getNameAndExtension} from "../../Util/FileSystems/PathUtil.js";
import editor from "../../editorInstance.js";

export default class ProjectAssetTypeJavascript extends ProjectAssetType{

	static type = "JJ:javascript";
	static newFileName = "New Script";
	static newFileExtension = "js";
	static storeInProjectAsJson = false;

	static assetSettingsStructure = {
		outputLocation: {
			label: "Build output location",
			type: "string",
		},
		buildButton: {
			label: "Build",
			type: "button",
			guiItemOpts: {
				onClick: async context => {
					for(const asset of context.selectedAssets){
						if(asset.projectAssetType instanceof this){
							let outputPath = null;
							const outputLocation = asset?.assetSettings?.outputLocation;
							if(outputLocation){
								outputPath = outputLocation.split("/");
								//todo: support relative paths and starting with a leading slash
							}else{
								outputPath = [...asset.path];
								if(outputPath.length > 0){
									const {name, extension} = getNameAndExtension(outputPath[outputPath.length - 1]);
									let newName = name;
									newName += ".min";
									if(extension) newName += "." + extension;
									outputPath[outputPath.length - 1] = newName;
								}
							}

							if(outputPath && outputPath.length > 0){
								const builtScript = await editor.scriptBuilder.buildScript(asset.path.join("/"));
								editor.projectManager.currentProjectFileSystem.writeText(outputPath, builtScript);
							}
						}
					}
				}
			}
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
