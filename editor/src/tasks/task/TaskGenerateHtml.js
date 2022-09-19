import {ProjectAssetTypeHtml} from "../../assets/projectAssetType/ProjectAssetTypeHtml.js";
import {createTreeViewStructure} from "../../ui/propertiesTreeView/createStructureHelpers.js";
import {Task} from "./Task.js";

/**
 * @fileoverview A task for making modifications to an existing html template file.
 * Use this to replace portions of the template such as script and style tags.
 */

/**
 * @typedef TaskGenerateHtmlConfig
 * @property {import("../../../../src/mod.js").UuidString?} template
 * @property {{find?: string, replace?: string}[]} replacements
 * @property {import("../../util/fileSystems/EditorFileSystem.js").EditorFileSystemPath} outputLocation
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
		const assetManager = this.editorInstance.projectManager.assetManager;
		if (!assetManager) {
			throw new Error("Failed to run task, no asset manager");
		}
		const fileSystem = this.editorInstance.projectManager.currentProjectFileSystem;
		if (!fileSystem) {
			throw new Error("Failed to run task, no file system");
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

		await fileSystem.writeText(config.outputLocation, html);

		return {};
	}
}
