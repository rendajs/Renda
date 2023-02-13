import {ProjectAssetTypeHtml} from "../../assets/projectAssetType/ProjectAssetTypeHtml.js";
import {createTreeViewStructure} from "../../ui/propertiesTreeView/createStructureHelpers.js";
import {Task} from "./Task.js";

/**
 * @fileoverview A task for making modifications to an existing html template file.
 * Use this to replace portions of the template such as script and style tags.
 */

/**
 * @typedef TaskGenerateHtmlConfig
 * @property {import("../../../../src/mod.js").UuidString?} template The uuid of a html asset to use as a template.
 * @property {TaskGenerateHtmlReplacement[]} replacements A list of strings to replace in the template.
 * @property {import("../../util/fileSystems/StudioFileSystem.js").StudioFileSystemPath} outputLocation The location
 * to write the modified html.
 */

/**
 * @typedef TaskGenerateHtmlReplacement
 * @property {string} [find] The variable name to look for, excluding the leading dollar sign ($).
 * @property {string} [replace] The string to replace it with.
 */

/** @extends {Task<TaskGenerateHtmlConfig>} */
export class TaskGenerateHtml extends Task {
	static uiName = "Generate Html";
	static type = "renda:generateHtml";

	static configStructure = createTreeViewStructure({
		template: {
			type: "droppable",
			guiOpts: {
				supportedAssetTypes: [ProjectAssetTypeHtml],
			},
		},
		replacements: {
			type: "array",
			guiOpts: {
				arrayType: "object",
				arrayGuiOpts: {
					structure: {
						find: {
							type: "string",
						},
						replace: {
							type: "string",
						},
					},
				},
			},
		},
		outputLocation: {
			type: "path",
		},
	});

	/**
	 * @param {import("./Task.js").RunTaskOptions<TaskGenerateHtmlConfig>} options
	 */
	async runTask({config}) {
		if (!config) {
			throw new Error("Failed to run task: no config provided");
		}
		const assetManager = this.editorInstance.projectManager.assetManager;
		if (!assetManager) {
			throw new Error("Failed to run task, no asset manager");
		}

		const templateUuid = config.template;
		if (!templateUuid) {
			throw new Error("Failed to run task, no template provided");
		}
		const templateAsset = await assetManager.getProjectAssetFromUuid(templateUuid, {
			assertAssetType: ProjectAssetTypeHtml,
		});
		if (!templateAsset) {
			throw new Error("Failed to run task, template asset not found");
		}
		let html = await templateAsset.readAssetData();
		for (const {find, replace} of config.replacements) {
			if (!find) continue;
			html = html.replaceAll("$" + find, replace || "");
		}

		/** @type {import("./Task.js").RunTaskReturn} */
		const result = {
			writeAssets: [
				{
					fileData: html,
					path: config.outputLocation,
					assetType: "renda:html",
				},
			],
		};
		return result;
	}
}
