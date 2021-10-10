import PropertiesAssetContent from "./PropertiesAssetContent.js";
import ProjectAsset from "../Assets/ProjectAsset.js";
import editor from "../editorInstance.js";

export default class PropertiesAssetContentAssetBundle extends PropertiesAssetContent {
	constructor() {
		super();
		this.bundleSettingsTree = this.treeView.addCollapsable("asset bundle settings");

		/** @type {import("../UI/PropertiesTreeView/PropertiesTreeView.js").PropertiesTreeViewStructure} */
		this.bundleSettingsStructure = {
			outputLocation: {
				type: String,
				guiOpts: {
					label: "Bundle output location",
				},
			},
			bundleButton: {
				type: "button",
				/** @type {import("../UI/Button.js").ButtonGuiOptions} */
				guiOpts: {
					text: "Bundle",
					onClick: () => {
						editor.assetBundler.bundle(this.currentSelection[0]);
					},
				},
			},
			assets: {
				type: Array,
				arrayOpts: {
					type: {
						asset: {type: ProjectAsset},
						includeChildren: {
							type: Boolean,
							defaultValue: true,
						},
					},
				},
			},
			excludeAssets: {
				type: Array,
				arrayOpts: {type: ProjectAsset},
			},
			excludeAssetsRecursive: {
				type: Array,
				arrayOpts: {type: ProjectAsset},
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
