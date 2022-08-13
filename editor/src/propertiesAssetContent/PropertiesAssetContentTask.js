import {PropertiesAssetContent} from "./PropertiesAssetContent.js";

/**
 * @extends {PropertiesAssetContent<import("../assets/projectAssetType/ProjectAssetTypeTask.js").ProjectAssetTypeTask>}
 */
export class PropertiesAssetContentTask extends PropertiesAssetContent {
	#isLoadingTaskAssets = false;
	/** @type {string?} */
	#currentSelectedTaskType = null;
	/** @type {import("../ui/propertiesTreeView/types.js").PropertiesTreeViewStructure?} */
	#currentConfigStructure = null;
	/**
	 * @param {ConstructorParameters<typeof PropertiesAssetContent>} args
	 */
	constructor(...args) {
		super(...args);

		this.taskConfigTree = this.treeView.addCollapsable("task settings");
		this.taskConfigTree.onChildValueChange(() => {
			if (this.#isLoadingTaskAssets) return;
			this.saveTaskAsset();
		});

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

		this.loadTaskAssets();
	}

	/**
	 * @override
	 * @param {import("../assets/ProjectAsset.js").ProjectAsset<any>[]} selectedAssets
	 */
	async selectionUpdated(selectedAssets) {
		super.selectionUpdated(selectedAssets);
		this.loadTaskAssets();
	}

	async loadTaskAssets() {
		this.#isLoadingTaskAssets = true;
		this.runTaskButton.setDisabled(true);

		if (this.currentSelection.length == 0) {
			return;
		} else if (this.currentSelection.length > 1) {
			// TODO
			throw new Error("Multi task selection not yet implemented");
		}
		const asset = this.currentSelection[0];
		const assetContent = await asset.readAssetData();
		this.#currentSelectedTaskType = assetContent.taskType;
		const taskType = this.editorInstance.taskManager.getTaskType(assetContent.taskType);
		this.#currentConfigStructure = taskType.configStructure;
		if (taskType.configStructure) {
			this.taskConfigTree.generateFromSerializableStructure(taskType.configStructure);
			const config = /** @type {import("../ui/propertiesTreeView/types.js").StructureToSetObject<any>?} */ (assetContent.taskConfig);
			if (config) {
				this.taskConfigTree.fillSerializableStructureValues(config);
			}
		} else {
			this.taskConfigTree.clearChildren();
		}
		this.runTaskButton.setDisabled(false);
		this.#isLoadingTaskAssets = false;
	}

	async saveTaskAsset() {
		if (!this.#currentSelectedTaskType) {
			throw new Error("Assertion failed, no task type set.");
		}
		/** @type {import("../assets/projectAssetType/ProjectAssetTypeTask.js").TaskProjectAssetDiskData} */
		const assetData = {
			taskType: this.#currentSelectedTaskType,
		};
		if (this.#currentConfigStructure) {
			const configData = this.taskConfigTree.getSerializableStructureValues(this.#currentConfigStructure, {
				purpose: "fileStorage",
			});
			assetData.taskConfig = configData;
		}
		await this.currentSelection[0].writeAssetData(assetData);
	}
}
