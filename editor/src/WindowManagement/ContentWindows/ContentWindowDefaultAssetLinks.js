import editor from "../../editorInstance.js";
import ContentWindow from "./ContentWindow.js";
import PropertiesTreeView from "../../UI/PropertiesTreeView/PropertiesTreeView.js";
import ProjectAsset from "../../Assets/ProjectAsset.js";
import { generateUuid } from "../../Util/Util.js";

export default class ContentWindowDefaultAssetLinks extends ContentWindow{

	static contentWindowTypeId = "defaultAssetLinks";
	static contentWindowUiName = "Default Asset Links";

	constructor(){
		super(...arguments);

		this.builtInAssetLinksTreeView = new PropertiesTreeView();
		this.builtInAssetLinksTreeView.onChildValueChange(() => this.handleGuiValueChange());
		this.contentEl.appendChild(this.builtInAssetLinksTreeView.el);

		this.builtInAssetLinkGuiStructure = this.getAssetLinkGuiStructure(true);

		this.guiStructure = {
			defaultAssetLinks: {
				type: Array,
				arrayOpts: this.getAssetLinkGuiStructure(false),
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

	async loadDefaultAssetLinks(){
		await editor.projectManager.waitForAssetManagerLoad();
		await editor.projectManager.assetManager.waitForAssetSettingsLoad();
		if(!this.el) return; //the content window was destructed

		this.builtInAssetLinksTreeView.clearChildren();
		for(const builtInAssetLink of editor.builtInDefaultAssetLinksManager.registeredAssetLinks){
			const item = this.builtInAssetLinksTreeView.addItem({
				guiOpts: {
					label: builtInAssetLink.name,
				},
				...this.builtInAssetLinkGuiStructure,
			});
			const assetLink = editor.projectManager.assetManager.getDefaultAssetLink(builtInAssetLink.defaultAssetUuid);
			item.setValue({
				originalAsset: assetLink.originalAssetUuid,
				defaultAsset: builtInAssetLink.defaultAssetUuid,
			});
		}

		const values = {
			defaultAssetLinks: [],
		}
		for(const [uuid, assetLink] of editor.projectManager.assetManager.defaultAssetLinks){
			if(assetLink.isBuiltIn) continue;
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

	getAssetLinkGuiStructure(isBuiltIn){
		const typeObj = {};
		if(!isBuiltIn){
			typeObj.name = {type: String};
		}
		typeObj.originalAsset = {type: ProjectAsset};
		typeObj.defaultAsset = {
			type: ProjectAsset,
			guiOpts: {
				disabled: true,
			},
		};
		return {
			type: typeObj,
		};
	}

	handleGuiValueChange(){
		if(this.isLoadingAssetLinks || this.isParsingValueChange) return;
		this.isParsingValueChange = true;

		const builtInAssetLinks = [];
		const assetLinks = [];

		for(const child of this.builtInAssetLinksTreeView.children){
			const guiValues = child.getValue();
			builtInAssetLinks.push({
				defaultAssetUuid: guiValues.defaultAsset,
				originalAssetUuid: guiValues.originalAsset,
			});
		}

		const guiValues = this.treeView.getSerializableStructureValues(this.guiStructure);
		for(const defaultAssetConfig of guiValues.defaultAssetLinks){
			assetLinks.push({
				name: defaultAssetConfig.name,
				defaultAssetUuid: defaultAssetConfig.defaultAsset,
				originalAssetUuid: defaultAssetConfig.originalAsset,
			});
		}

		//save default asset link settings to disk and generate uuids for new links
		const userDefaultAssetLinkUuids = editor.projectManager.assetManager.setDefaultAssetLinks(builtInAssetLinks, assetLinks);

		const arrayTreeView = this.treeView.getSerializableStructureEntry("defaultAssetLinks");
		for(const [i, valueItem] of arrayTreeView.gui.valueItems.entries()){
			const defaultAssetEntry = valueItem.gui.treeView.getSerializableStructureEntry("defaultAsset");
			defaultAssetEntry.gui.setValue(userDefaultAssetLinkUuids[i]);
		}
		this.isParsingValueChange = false;
	}
}
