import {ProjectAssetType} from "./ProjectAssetType.js";
import {getNameAndExtension} from "../../util/fileSystems/pathUtil.js";
import {getEditorInstance} from "../../editorInstance.js";

/**
 * @typedef {object} AssetBundleDiskDataProjectAssetTypeJavascriptAssetSettings
 * @property {string} outputLocation
 * @property {boolean} useClosureCompiler
 */

/**
 * @extends {ProjectAssetType<null, null, string, AssetBundleDiskDataProjectAssetTypeJavascriptAssetSettings>}
 */
export class ProjectAssetTypeJavascript extends ProjectAssetType {
	static type = "renda:javascript";
	static typeUuid = "3654355b-9c4c-4ac0-b3d7-81565208ec0f";
	static newFileName = "New Script";
	static newFileExtension = "js";
	static storeInProjectAsJson = false;
	static storeInProjectAsText = true;

	/** @type {import("../../ui/propertiesTreeView/types.js").PropertiesTreeViewStructure} */
	static assetSettingsStructure = {
		outputLocation: {
			type: "string",
			guiOpts: {
				label: "Build output location",
			},
		},
		useClosureCompiler: {
			type: "boolean",
		},
		buildButton: {
			type: "button",
			/** @type {import("../../ui/Button.js").ButtonGuiOptionsWithCallbacksContext<import("../../propertiesWindowContent/PropertiesWindowContentAsset.js").PropertiesWindowContentAssetCallbacksContext>} */
			guiOpts: {
				text: "Build",
				onClick: async context => {
					const castSelected = /** @type {import("../ProjectAsset.js").ProjectAsset<ProjectAssetTypeJavascript>[]} */ (context.selectedAssets);
					for (const asset of castSelected) {
						let outputPath = null;
						const outputLocation = asset?.assetSettings?.outputLocation;
						if (outputLocation) {
							outputPath = outputLocation.split("/").filter(s => !!s);
							// todo: support relative paths and starting with a leading slash
						} else {
							outputPath = [...asset.path];
							if (outputPath.length > 0) {
								const {name, extension} = getNameAndExtension(outputPath[outputPath.length - 1]);
								let newName = name;
								newName += ".min";
								if (extension) newName += "." + extension;
								outputPath[outputPath.length - 1] = newName;
							}
						}

						if (outputPath && outputPath.length > 0) {
							const buildOpts = {
								useClosureCompiler: asset?.assetSettings?.useClosureCompiler ?? false,
							};
							const editor = getEditorInstance();
							if (!editor.projectManager.currentProjectFileSystem) return;
							await editor.projectManager.currentProjectFileSystem.getPermission(outputPath, {writable: true, prompt: true});
							await editor.scriptBuilder.buildScript(asset.path, outputPath, editor.projectManager.currentProjectFileSystem, editor.devSocket ?? null, buildOpts);
						}
					}
				},
			},
		},
	};
}
