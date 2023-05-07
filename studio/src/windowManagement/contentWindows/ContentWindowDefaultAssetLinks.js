import {ContentWindow} from "./ContentWindow.js";
import {PropertiesTreeView} from "../../ui/propertiesTreeView/PropertiesTreeView.js";
import {createTreeViewEntryOptions, createTreeViewStructure} from "../../ui/propertiesTreeView/createStructureHelpers.js";

export class ContentWindowDefaultAssetLinks extends ContentWindow {
	static contentWindowTypeId = /** @type {const} */ ("renda:defaultAssetLinks");
	static contentWindowUiName = "Default Asset Links";
	static contentWindowUiIcon = "static/icons/contentWindowTabs/defaultAssetLinks.svg";

	/**
	 * @param {ConstructorParameters<typeof ContentWindow>} args
	 */
	constructor(...args) {
		super(...args);

		this.builtInAssetLinksTreeView = new PropertiesTreeView();
		this.builtInAssetLinksTreeView.onChildValueChange(this.#handleGuiValueChange);
		this.contentEl.appendChild(this.builtInAssetLinksTreeView.el);

		this.builtInAssetLinkGuiStructure = createTreeViewEntryOptions({
			type: "object",
			guiOpts: {
				label: "todo", // todo: get name from builtInAssetLink.name
				structure: this.getAssetLinkGuiStructure(true),
			},
		});

		this.guiStructure = createTreeViewStructure({
			defaultAssetLinks: {
				type: "array",
				guiOpts: {
					arrayType: "object",
					arrayGuiOpts: {
						structure: this.getAssetLinkGuiStructure(false),
					},
				},
			},
		});

		this.treeView = PropertiesTreeView.withStructure(this.guiStructure);
		this.contentEl.appendChild(this.treeView.el);

		this.isLoadingAssetLinks = true;
		this.treeView.onChildValueChange(this.#handleGuiValueChange);

		this.loadDefaultAssetLinks();
	}

	async loadDefaultAssetLinks() {
		await this.studioInstance.projectManager.waitForAssetListsLoad();
		const assetManager = await this.studioInstance.projectManager.getAssetManager();
		if (!this.el) return; // the content window was destructed

		this.builtInAssetLinksTreeView.clearChildren();
		for (const builtInAssetLink of this.studioInstance.builtInDefaultAssetLinksManager.registeredAssetLinks) {
			const item = this.builtInAssetLinksTreeView.addItem(this.builtInAssetLinkGuiStructure);
			const assetLink = assetManager.getDefaultAssetLink(builtInAssetLink.defaultAssetUuid);
			const originalAsset = assetLink && assetLink.originalAssetUuid;
			item.setValue({
				originalAsset,
				defaultAsset: builtInAssetLink.defaultAssetUuid,
			});
		}

		const defaultAssetLinks = [];
		for (const [uuid, assetLink] of assetManager.defaultAssetLinks) {
			if (assetLink.isBuiltIn) continue;
			defaultAssetLinks.push({
				name: assetLink.name || "",
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
	 * @template {boolean} T
	 * @param {T} isBuiltIn
	 */
	getAssetLinkGuiStructure(isBuiltIn) {
		const nameStructure = createTreeViewStructure({
			name: {
				type: "string",
			},
		});
		const restStructure = createTreeViewStructure({
			originalAsset: {
				type: "droppable",
			},
			defaultAsset: {
				type: "droppable",
				guiOpts: {
					disabled: true,
				},
			},
		});
		let fullStructure = {};
		if (isBuiltIn) {
			fullStructure = {
				...restStructure,
			};
		} else {
			fullStructure = {
				...nameStructure,
				...restStructure,
			};
		}
		return /** @type {T extends true ? typeof restStructure : (typeof nameStructure & typeof restStructure)} */ (fullStructure);
	}

	/**
	 * @param {import("../../ui/propertiesTreeView/types.js").PropertiesTreeViewChangeEvent<any>} changeEvent
	 */
	#handleGuiValueChange = (changeEvent) => {
		if (changeEvent.trigger != "user") return;

		/** @type {import("../../assets/AssetManager.js").SetDefaultBuiltInAssetLinkData[]} */
		const builtInAssetLinks = [];
		/** @type {import("../../assets/AssetManager.js").SetDefaultAssetLinkData[]} */
		const assetLinks = [];

		for (const child of this.builtInAssetLinksTreeView.children) {
			const castChild = /** @type {import("../../ui/propertiesTreeView/types.js").TreeViewEntryFactoryReturnType<typeof this.builtInAssetLinkGuiStructure>} */ (child);
			const guiValues = castChild.getValue();
			if (!guiValues.defaultAsset) continue;
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
		const assetManager = this.studioInstance.projectManager.assertAssetManagerExists();
		const userDefaultAssetLinkUuids = assetManager.setDefaultAssetLinks(builtInAssetLinks, assetLinks);

		const arrayTreeView = this.treeView.getSerializableStructureEntry("defaultAssetLinks");
		for (const [i, valueItem] of arrayTreeView.gui.valueItems.entries()) {
			const defaultAssetEntry = valueItem.gui.treeView.getSerializableStructureEntry("defaultAsset");
			defaultAssetEntry?.gui.setValue(userDefaultAssetLinkUuids[i]);
		}
	}
}
