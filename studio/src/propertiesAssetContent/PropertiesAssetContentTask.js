import {createTreeViewStructure} from "../ui/propertiesTreeView/createStructureHelpers.js";
import {PropertiesAssetContent} from "./PropertiesAssetContent.js";

export const environmentVariablesStructure = createTreeViewStructure({
	environmentVariables: {
		type: "array",
		guiOpts: {
			arrayType: "object",
			arrayGuiOpts: {
				structure: {
					key: {
						type: "string",
					},
					value: {
						type: "string",
					},
				},
			},
		},
	},
});

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

		/** @type {import("../ui/propertiesTreeView/PropertiesTreeView.js").PropertiesTreeView<typeof environmentVariablesStructure>} */
		this.environmentVariablesTree = this.treeView.addCollapsable("Environment Variables");
		this.environmentVariablesTree.renderContainer = true;
		this.environmentVariablesTree.generateFromSerializableStructure(environmentVariablesStructure);
		this.environmentVariablesTree.onChildValueChange(() => {
			if (this.#isLoadingTaskAssets) return;
			this.saveTaskAsset();
		});

		this.taskConfigTree = this.treeView.addCollapsable("Task Settings");
		this.taskConfigTree.renderContainer = true;
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
						this.studioInstance.taskManager.runTaskAsset(asset);
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
		const taskType = this.studioInstance.taskManager.getTaskType(assetContent.taskType);

		const environmentVariables = [];
		if (assetContent.environmentVariables) {
			for (const [key, value] of Object.entries(assetContent.environmentVariables)) {
				environmentVariables.push({key, value});
			}
		}
		this.environmentVariablesTree.fillSerializableStructureValues({
			environmentVariables,
		});

		this.#currentConfigStructure = taskType.configStructure;
		if (taskType.configStructure) {
			this.taskConfigTree.generateFromSerializableStructure(taskType.configStructure);
			const configData = this.studioInstance.taskManager.transformAssetToUiData(this.#currentSelectedTaskType, assetContent.taskConfig);
			const castConfigData = /** @type {import("../ui/propertiesTreeView/types.js").StructureToSetObject<any> | undefined} */ (configData);
			if (castConfigData) {
				this.taskConfigTree.fillSerializableStructureValues(castConfigData);
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
		const environmentVariablesValue = this.environmentVariablesTree.getSerializableStructureValues(environmentVariablesStructure, {
			purpose: "fileStorage",
		});
		if (environmentVariablesValue?.environmentVariables) {
			/** @type {Object<string, string>} */
			const variables = {};
			let hasItem = false;
			for (const item of environmentVariablesValue.environmentVariables) {
				// TODO: Handle undefined in the getValue() function from array guis #119
				if (!item) continue;
				if (!item.key) continue;
				variables[item.key] = item.value || "";
				hasItem = true;
			}
			if (hasItem) {
				assetData.environmentVariables = variables;
			}
		}
		if (this.#currentConfigStructure) {
			const uiConfigData = this.taskConfigTree.getSerializableStructureValues(this.#currentConfigStructure, {
				purpose: "fileStorage",
			});
			const configData = this.studioInstance.taskManager.transformUiToAssetData(this.#currentSelectedTaskType, uiConfigData);
			if (configData) assetData.taskConfig = configData;
		}
		await this.currentSelection[0].writeAssetData(assetData);
	}
}
