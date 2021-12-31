import {PropertiesAssetContent} from "./PropertiesAssetContent.js";
import {ProjectAsset} from "../../assets/ProjectAsset.js";
import {getEditorInstance} from "../../editorInstance.js";

export class PropertiesAssetContentAssetBundle extends PropertiesAssetContent {
	constructor() {
		super();
		this.bundleSettingsTree = this.treeView.addCollapsable("asset bundle settings");

		/** @type {import("../../UI/PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewStructure} */
		this.bundleSettingsStructure = {
			outputLocation: {
				type: "string",
				guiOpts: {
					label: "Bundle output location",
				},
			},
			bundleButton: {
				type: "button",
				guiOpts: {
					text: "Bundle",
					onClick: () => {
						const editor = getEditorInstance();
						editor.assetBundler.bundle(editor.projectManager.assetManager, this.currentSelection[0]);
					},
				},
			},
			assets: {
				type: "array",
				guiOpts: {
					arrayType: "object",
					arrayGuiOpts: {
						structure: {
							asset: {
								type: "droppable",
								guiOpts: {
									supportedAssetTypes: [ProjectAsset],
								},
							},
							includeChildren: {
								type: "boolean",
								guiOpts: {
									defaultValue: true,
								},
							},
						},
					},
				},
			},
			excludeAssets: {
				type: "array",
				guiOpts: {
					arrayType: "droppable",
					arrayGuiOpts: {
						supportedAssetTypes: [ProjectAsset],
					},
				},
			},
			excludeAssetsRecursive: {
				type: "array",
				guiOpts: {
					arrayType: "droppable",
					arrayGuiOpts: {
						supportedAssetTypes: [ProjectAsset],
					},
				},
			},
		};
		this.isUpdatingBundleSettingsTree = false;
		this.bundleSettingsTree.generateFromSerializableStructure(this.bundleSettingsStructure);
		this.bundleSettingsTree.onChildValueChange(() => {
			if (this.isUpdatingBundleSettingsTree) return;
			const jsonData = this.getGuiValues();
			// todo: handle multiple selected items or no selection
			this.currentSelection[0].writeAssetData(jsonData);
		});
	}

	async selectionUpdated(selectedBundles) {
		super.selectionUpdated(selectedBundles);
		// todo: handle multiple selected items or no selection
		const bundle = selectedBundles[0];
		const guiValues = await bundle.readAssetData();
		this.isUpdatingBundleSettingsTree = true;
		this.bundleSettingsTree.fillSerializableStructureValues(guiValues);
		this.isUpdatingBundleSettingsTree = false;
	}

	getGuiValues() {
		return this.bundleSettingsTree.getSerializableStructureValues(this.bundleSettingsStructure);
	}
}
