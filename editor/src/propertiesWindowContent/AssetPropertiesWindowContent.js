import {PropertiesWindowContent} from "./PropertiesWindowContent.js";
import {PropertiesTreeView} from "../ui/propertiesTreeView/PropertiesTreeView.js";
import {ProjectAsset} from "../assets/ProjectAsset.js";
import {PropertiesAssetContentGenericStructure} from "../propertiesAssetContent/PropertiesAssetContentGenericStructure.js";

/**
 * @typedef {Object} AssetPropertiesWindowContentCallbacksContext
 * @property {*[]} selectedAssets
 */

export class AssetPropertiesWindowContent extends PropertiesWindowContent {
	/**
	 * @param {ConstructorParameters<typeof PropertiesWindowContent>} args
	 */
	constructor(...args) {
		super(...args);

		this.currentSelection = null;
		/**
		 * An instance of PropertiesAssetContent that is currently being used
		 * to render the asset ui in the properties window for the current selection.
		 * @type {import("../propertiesAssetContent/PropertiesAssetContent.js").PropertiesAssetContent<any>?}
		 */
		this.activeAssetContent = null;

		this.treeView = new PropertiesTreeView();
		this.el.appendChild(this.treeView.el);

		this.assetSettingsTree = this.treeView.addCollapsable("Asset settings will be placed here");
		this.assetContentTree = this.treeView.addCollapsable("Asset content will be placed here");

		this.isUpdatingAssetSettingsUi = false;
		this.assetSettingsTree.onChildValueChange(() => {
			if (this.isUpdatingAssetSettingsUi) return;
			this.saveAssetSettings();
		});
	}

	destructor() {
		this.treeView.destructor();
		super.destructor();
	}

	static get useForTypes() {
		return [ProjectAsset];
	}

	/**
	 * @override
	 * @param {ProjectAsset<any>[]} selectedObjects
	 */
	activeObjectsChanged(selectedObjects) {
		this.currentSelection = selectedObjects;
		this.updateAssetSettings();
		this.updateAssetContent();
	}

	async updateAssetSettings() {
		if (!this.currentSelection) return;

		/** @type {import("../ui/propertiesTreeView/types.js").PropertiesTreeViewStructure} */
		let settingsStructure = {};
		/** @type {unknown} */
		let settingsValues = {};

		for (const projectAsset of this.currentSelection) {
			const structure = await projectAsset.getPropertiesAssetSettingsStructure();
			const values = projectAsset.assetSettings;
			// todo: handle selecting multiple assets or none
			if (structure) {
				settingsStructure = structure;
				settingsValues = values;
				break;
			}
		}

		/** @type {AssetPropertiesWindowContentCallbacksContext} */
		const callbacksContext = {
			selectedAssets: this.currentSelection,
		};

		this.assetSettingsTree.generateFromSerializableStructure(settingsStructure, {callbacksContext});
		this.isUpdatingAssetSettingsUi = true;
		const castSettingsValues = /** @type {import("../ui/propertiesTreeView/types.js").StructureToSetObject<any>} */ (settingsValues);
		this.assetSettingsTree.fillSerializableStructureValues(castSettingsValues);
		this.isUpdatingAssetSettingsUi = false;
	}

	// todo: make sure only one instance runs at a time
	async saveAssetSettings() {
		if (!this.currentSelection) return;
		for (const projectAsset of this.currentSelection) {
			const structure = await projectAsset.getPropertiesAssetSettingsStructure();
			// todo: handle selecting multiple assets or none
			if (structure) {
				projectAsset.assetSettings = this.assetSettingsTree.getSerializableStructureValues(structure, {purpose: "fileStorage"});
				const assetManager = await this.editorInstance.projectManager.getAssetManager();
				await assetManager.saveAssetSettings();
				break;
			}
		}
	}

	// todo: make sure only one instance runs at a time
	async updateAssetContent() {
		let foundStructure = null;
		let foundStructureType = null;
		let foundConstructor = null;
		if (!this.currentSelection) return;
		for (const projectAsset of this.currentSelection) {
			const structureFromAsset = await projectAsset.getPropertiesAssetContentStructure();
			if (structureFromAsset) {
				const assetType = await projectAsset.getProjectAssetType();
				if (foundStructureType && foundStructureType != assetType) {
					continue;
				}
				foundStructure = structureFromAsset;
				foundStructureType = assetType;
			} else if (!foundStructure && !foundConstructor) {
				foundConstructor = await projectAsset.getPropertiesAssetContentConstructor();
			}
		}

		let constructor = foundConstructor;
		if (foundStructure) {
			constructor = PropertiesAssetContentGenericStructure;
		}

		let needsNew = false;
		if (constructor) {
			// If there is no assetcontent created yet
			if (!this.activeAssetContent) needsNew = true;

			// If the assetcontent is of a different type
			if (this.activeAssetContent?.constructor != constructor) needsNew = true;

			// If both new and old are of type GenericStructure, but the structure is different
			if (constructor == PropertiesAssetContentGenericStructure && this.activeAssetContent instanceof PropertiesAssetContentGenericStructure) {
				if (foundStructure != this.activeAssetContent.structure) needsNew = true;
			}
		}

		// Destroy existing assetcontent if needed
		if (this.activeAssetContent && (needsNew || !constructor)) {
			if (this.activeAssetContent) this.activeAssetContent.destructor();
			this.activeAssetContent = null;
			this.assetContentTree.clearChildren();
		}

		// Create new assetcontent if needed
		if (needsNew && constructor) {
			if (constructor == PropertiesAssetContentGenericStructure && foundStructure) {
				this.activeAssetContent = new PropertiesAssetContentGenericStructure(foundStructure, this.editorInstance);
			} else {
				this.activeAssetContent = new constructor(this.editorInstance);
			}
			this.assetContentTree.addChild(this.activeAssetContent.treeView);
		}
		if (this.activeAssetContent) {
			this.activeAssetContent.selectionUpdated(this.currentSelection);
		}
	}
}
