import {ContentWindow} from "./ContentWindow.js";
import {PropertiesTreeView} from "../../UI/PropertiesTreeView/PropertiesTreeView.js";
import {ProjectAsset} from "../../assets/ProjectAsset.js";

export class ContentWindowDefaultAssetLinks extends ContentWindow {
	static contentWindowTypeId = "defaultAssetLinks";
	static contentWindowUiName = "Default Asset Links";
	static contentWindowUiIcon = "icons/contentWindowTabs/defaultAssetLinks.svg";

	/**
	 * @param {ConstructorParameters<typeof ContentWindow>} args
	 */
	constructor(...args) {
		super(...args);

		this.builtInAssetLinksTreeView = new PropertiesTreeView();
		this.builtInAssetLinksTreeView.onChildValueChange(() => this.handleGuiValueChange());
		this.contentEl.appendChild(this.builtInAssetLinksTreeView.el);

		this.builtInAssetLinkGuiStructure = this.getAssetLinkGuiStructure(true);

		/** @type {import("../../UI/PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewStructure} */
		this.guiStructure = {
			defaultAssetLinks: {
				type: "array",
				guiOpts: {
					arrayType: "object",
					arrayGuiOpts: {
						structure: this.getAssetLinkGuiStructure(false),
					},
				},
			},
		};

		this.treeView = new PropertiesTreeView();
		this.contentEl.appendChild(this.treeView.el);
		this.treeView.generateFromSerializableStructure(this.guiStructure);

		this.isLoadingAssetLinks = true;
		this.isParsingValueChange = false;
		this.treeView.onChildValueChange(() => this.handleGuiValueChange());

		this.loadDefaultAssetLinks();
	}

	async loadDefaultAssetLinks() {
		await this.editorInstance.projectManager.waitForAssetManagerLoad();
		await this.editorInstance.projectManager.assetManager.waitForAssetSettingsLoad();
		if (!this.el) return; // the content window was destructed

		this.builtInAssetLinksTreeView.clearChildren();
		for (const builtInAssetLink of this.editorInstance.builtInDefaultAssetLinksManager.registeredAssetLinks) {
			const item = this.builtInAssetLinksTreeView.addItem({
				type: "object",
				guiOpts: {
					label: builtInAssetLink.name,
					structure: this.builtInAssetLinkGuiStructure,
				},
			});
			const assetLink = this.editorInstance.projectManager.assetManager.getDefaultAssetLink(builtInAssetLink.defaultAssetUuid);
			const originalAsset = assetLink && assetLink.originalAssetUuid;
			item.setValue({
				originalAsset,
				defaultAsset: builtInAssetLink.defaultAssetUuid,
			});
		}

		const defaultAssetLinks = [];
		for (const [uuid, assetLink] of this.editorInstance.projectManager.assetManager.defaultAssetLinks) {
			if (assetLink.isBuiltIn) continue;
			defaultAssetLinks.push({
				name: assetLink.name,
				originalAsset: assetLink.originalAssetUuid,
				defaultAsset: uuid,
			});
		}
		const values = {
			defaultAssetLinks,
		};
		this.isLoadingAssetLinks = true;
		this.treeView.fillSerializableStructureValues(values);
		this.isLoadingAssetLinks = false;
	}

	/**
	 * @param {boolean} isBuiltIn
	 */
	getAssetLinkGuiStructure(isBuiltIn) {
		/** @type {import("../../UI/PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewStructure} */
		const typeObj = {};
		if (!isBuiltIn) {
			typeObj.name = {type: "string"};
		}
		typeObj.originalAsset = {
			type: "droppable",
			guiOpts: {
				supportedAssetTypes: [ProjectAsset],
			},
		};
		typeObj.defaultAsset = {
			type: "droppable",
			guiOpts: {
				supportedAssetTypes: [ProjectAsset],
				disabled: true,
			},
		};
		return typeObj;
	}

	handleGuiValueChange() {
		if (this.isLoadingAssetLinks || this.isParsingValueChange) return;
		this.isParsingValueChange = true;

		/** @type {import("../../assets/AssetManager.js").SetDefaultBuiltInAssetLinkData[]} */
		const builtInAssetLinks = [];
		/** @type {import("../../assets/AssetManager.js").SetDefaultAssetLinkData[]} */
		const assetLinks = [];

		for (const child of this.builtInAssetLinksTreeView.children) {
			const guiValues = child.getValue();
			builtInAssetLinks.push({
				defaultAssetUuid: guiValues.defaultAsset,
				originalAssetUuid: guiValues.originalAsset,
			});
		}

		const guiValues = this.treeView.getSerializableStructureValues(this.guiStructure);
		for (const defaultAssetConfig of guiValues.defaultAssetLinks) {
			assetLinks.push({
				name: defaultAssetConfig.name,
				defaultAssetUuid: defaultAssetConfig.defaultAsset,
				originalAssetUuid: defaultAssetConfig.originalAsset,
			});
		}

		// save default asset link settings to disk and generate uuids for new links
		const userDefaultAssetLinkUuids = this.editorInstance.projectManager.assetManager.setDefaultAssetLinks(builtInAssetLinks, assetLinks);

		const arrayTreeView = this.treeView.getSerializableStructureEntry("defaultAssetLinks");
		const arrayGui = /** @type {import("../../UI/ArrayGui.js").ArrayGui} */(arrayTreeView.gui);
		for (const [i, valueItem] of arrayGui.valueItems.entries()) {
			const defaultAssetEntry = valueItem.gui.treeView.getSerializableStructureEntry("defaultAsset");
			defaultAssetEntry.gui.setValue(userDefaultAssetLinkUuids[i]);
		}
		this.isParsingValueChange = false;
	}
}
