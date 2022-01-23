import {PropertiesAssetContent} from "./PropertiesAssetContent.js";

/**
 * @extends {PropertiesAssetContent<any>}
 */
export class PropertiesAssetContentGenericStructure extends PropertiesAssetContent {
	/**
	 * @param {import("../../ui/propertiesTreeView/types.js").PropertiesTreeViewStructure} structure
	 * @param {ConstructorParameters<typeof PropertiesAssetContent>} args
	 */
	constructor(structure, ...args) {
		super(...args);

		this.structure = structure;

		this.assetTreeView = this.treeView.addCollapsable("Asset Values");
		this.assetTreeView.generateFromSerializableStructure(this.structure);
		this.assetTreeView.onChildValueChange(() => {
			if (this.isUpdatingUi) return;
			this.saveAsset();
		});

		this.isUpdatingUi = false;
	}

	/**
	 * @override
	 * @param {import("../../assets/ProjectAsset.js").ProjectAsset<any>[]} selectedAssets
	 */
	async selectionUpdated(selectedAssets) {
		super.selectionUpdated(selectedAssets);
		await this.loadAsset();
	}

	async loadAsset() {
		const editable = this.currentSelection.some(asset => asset.editable);
		this.assetTreeView.setFullTreeDisabled(!editable);

		// todo: handle multiple selected items or no selection
		const asset = this.currentSelection[0];
		const assetData = await asset.readAssetData();
		this.isUpdatingUi = true;

		const castAssetData = /** @type {Object.<string, unknown>} */ (assetData);
		this.assetTreeView.fillSerializableStructureValues(castAssetData);

		this.isUpdatingUi = false;
	}

	async saveAsset() {
		// todo: handle multiple selected items or no selection
		const assetData = this.assetTreeView.getSerializableStructureValues(this.structure, {
			purpose: "fileStorage",
		});
		await this.currentSelection[0].writeAssetData(assetData);
		this.currentSelection[0].liveAssetNeedsReplacement();
	}
}
