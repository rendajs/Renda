import ProjectAssetType from "./ProjectAssetType.js";
import {getNameAndExtension} from "../../Util/FileSystems/PathUtil.js";
import editor from "../../editorInstance.js";

export default class ProjectAssetTypeJavascript extends ProjectAssetType{

	static type = "JJ:javascript";
	static typeUuid = "3654355b-9c4c-4ac0-b3d7-81565208ec0f";
	static newFileName = "New Script";
	static newFileExtension = "js";
	static storeInProjectAsJson = false;
	static storeInProjectAsText = true;

	static assetSettingsStructure = {
		outputLocation: {
			type: String,
			guiOpts: {
				label: "Build output location",
			},
		},
		useClosureCompiler: {
			type: Boolean,
		},
		buildButton: {
			type: "button",
			guiOpts: {
				text: "Build",
				onClick: async context => {
					for(const asset of context.selectedAssets){
						let outputPath = null;
						const outputLocation = asset?.assetSettings?.outputLocation;
						if(outputLocation){
							outputPath = outputLocation.split("/").filter(s => !!s);
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
							const buildOpts = {
								useClosureCompiler: asset?.assetSettings?.useClosureCompiler ?? false,
							};
							await editor.projectManager.currentProjectFileSystem.getPermission(outputPath, {writable: true, prompt: true});
							await editor.scriptBuilder.buildScript(asset.path, outputPath, buildOpts);
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
