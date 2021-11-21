import PropertiesAssetContent from "./PropertiesAssetContent.js";

export default class PropertiesAssetContentGenericStructure extends PropertiesAssetContent {
	constructor(structure) {
		super();

		this.structure = structure;

		this.assetTreeView = this.treeView.addCollapsable("Asset Values");
		this.assetTreeView.generateFromSerializableStructure(this.structure);
		this.assetTreeView.onChildValueChange(() => {
			if (this.isUpdatingUi) return;
			this.saveAsset();
		});

		this.isUpdatingUi = false;
	}

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

		this.assetTreeView.fillSerializableStructureValues(assetData);

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
