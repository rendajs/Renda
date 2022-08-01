import {PropertiesAssetContent} from "./PropertiesAssetContent.js";

/**
 * @extends {PropertiesAssetContent<import("../assets/projectAssetType/TaskProjectAssetType.js").TaskProjectAssetType>}
 */
export class TaskPropertiesAssetContent extends PropertiesAssetContent {
	/**
	 * @param {ConstructorParameters<typeof PropertiesAssetContent>} args
	 */
	constructor(...args) {
		super(...args);

		this.taskSettingsTree = this.treeView.addCollapsable("task settings");
		this.runTaskButton = this.treeView.addItem({
			type: "button",
			guiOpts: {
				text: "Run Task",
				onClick: async () => {
					for (const asset of this.currentSelection) {
						const assetContent = await asset.readAssetData();
						this.editorInstance.taskManager.runTask({
							taskFileContent: assetContent,
						});
					}
				},
			},
		});
	}
}
