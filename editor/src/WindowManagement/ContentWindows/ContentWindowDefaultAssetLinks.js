import editor from "../../editorInstance.js";
import ContentWindow from "./ContentWindow.js";
import {PropertiesTreeView} from "../../UI/PropertiesTreeView/PropertiesTreeView.js";
import ProjectAsset from "../../Assets/ProjectAsset.js";

export class ContentWindowDefaultAssetLinks extends ContentWindow {
	static contentWindowTypeId = "defaultAssetLinks";
	static contentWindowUiName = "Default Asset Links";
	static contentWindowUiIcon = "icons/contentWindowTabs/defaultAssetLinks.svg";

	constructor() {
		super();

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
		await editor.projectManager.waitForAssetManagerLoad();
		await editor.projectManager.assetManager.waitForAssetSettingsLoad();
		if (!this.el) return; // the content window was destructed

		this.builtInAssetLinksTreeView.clearChildren();
		for (const builtInAssetLink of editor.builtInDefaultAssetLinksManager.registeredAssetLinks) {
			const item = this.builtInAssetLinksTreeView.addItem({
				type: "object",
				guiOpts: {
					label: builtInAssetLink.name,
					structure: this.builtInAssetLinkGuiStructure,
				},
			});
			const assetLink = editor.projectManager.assetManager.getDefaultAssetLink(builtInAssetLink.defaultAssetUuid);
			item.setValue({
				originalAsset: assetLink.originalAssetUuid,
				defaultAsset: builtInAssetLink.defaultAssetUuid,
			});
		}

		const values = {
			defaultAssetLinks: [],
		};
		for (const [uuid, assetLink] of editor.projectManager.assetManager.defaultAssetLinks) {
			if (assetLink.isBuiltIn) continue;
			values.defaultAssetLinks.push({
				name: assetLink.name,
				originalAsset: assetLink.originalAssetUuid,
				defaultAsset: uuid,
			});
		}
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

		const builtInAssetLinks = [];
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
		const userDefaultAssetLinkUuids = editor.projectManager.assetManager.setDefaultAssetLinks(builtInAssetLinks, assetLinks);

		const arrayTreeView = this.treeView.getSerializableStructureEntry("defaultAssetLinks");
		const arrayGui = /** @type {import("../../UI/ArrayGui.js").default} */(arrayTreeView.gui);
		for (const [i, valueItem] of arrayGui.valueItems.entries()) {
			const defaultAssetEntry = valueItem.gui.treeView.getSerializableStructureEntry("defaultAsset");
			defaultAssetEntry.gui.setValue(userDefaultAssetLinkUuids[i]);
		}
		this.isParsingValueChange = false;
	}
}
