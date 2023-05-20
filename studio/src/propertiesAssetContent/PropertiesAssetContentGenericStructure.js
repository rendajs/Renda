import {PropertiesAssetContent} from "./PropertiesAssetContent.js";

/**
 * @extends {PropertiesAssetContent<any>}
 */
export class PropertiesAssetContentGenericStructure extends PropertiesAssetContent {
	/**
	 * @param {ConstructorParameters<typeof PropertiesAssetContent>} args
	 */
	constructor(...args) {
		super(...args);

		this.structure = null;

		this.assetTreeView = this.treeView.addCollapsable();
		this.assetTreeView.renderContainer = true;
		this.assetTreeView.onChildValueChange(changeEvent => {
			if (changeEvent.trigger != "user") return;
			this.saveAsset();
		});
	}

	/**
	 * @param {import("../ui/propertiesTreeView/types.ts").PropertiesTreeViewStructure} structure
	 * @param {import("../assets/projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny?} assetType
	 */
	setStructure(structure, assetType) {
		if (this.structure) {
			throw new Error("Assertion failed: structure can only be set once.");
		}
		this.structure = structure;
		let uiName = "Asset Properties";
		if (assetType) {
			const castConstructor = /** @type {typeof import("../assets/projectAssetType/ProjectAssetType.js").ProjectAssetType} */ (assetType.constructor);
			uiName = castConstructor.getUiName();
		}
		this.assetTreeView.name = uiName;
		this.assetTreeView.generateFromSerializableStructure(this.structure);
	}

	/**
	 * @override
	 * @param {import("../assets/ProjectAsset.js").ProjectAsset<any>[]} selectedAssets
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

		const castAssetData = /** @type {Object<string, unknown>} */ (assetData);
		this.assetTreeView.fillSerializableStructureValues(castAssetData);
	}

	async saveAsset() {
		// todo: handle multiple selected items or no selection
		if (!this.structure) {
			throw new Error("Assertion failed, no structure has been set");
		}
		const assetData = this.assetTreeView.getSerializableStructureValues(this.structure, {
			purpose: "fileStorage",
		});
		await this.currentSelection[0].writeAssetData(assetData);
		this.currentSelection[0].liveAssetNeedsReplacement();
	}
}
