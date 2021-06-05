import editor from "../../editorInstance.js";
import ContentWindow from "./ContentWindow.js";
import PropertiesTreeView from "../../UI/PropertiesTreeView/PropertiesTreeView.js";
import ProjectAsset from "../../Assets/ProjectAsset.js";

export default class ContentWindowDefaultAssets extends ContentWindow{

	static windowName = "defaultAssets";

	constructor(){
		super();

		this.guiStructure = {
			defaultAssets: {
				type: Array,
				arrayOpts: {
					type: {
						name: {type: String},
						originalAsset: {
							type: ProjectAsset,
							guiOpts: {
								storageType: "uuid",
							},
						},
						defaultAsset: {
							type: ProjectAsset,
							guiOpts: {
								disabled: true,
								storageType: "uuid",
							},
						},
					},
				},
			},
		};

		this.treeView = new PropertiesTreeView();
		this.contentEl.appendChild(this.treeView.el);
		this.treeView.generateFromSerializableStructure(this.guiStructure);
		this.isParsingValueChange = false;
		this.treeView.onChildValueChange((e) => {
			if(this.isParsingValueChange) return;
			this.isParsingValueChange = true;

			const guiValues = this.treeView.getSerializableStructureValues(this.guiStructure, {resolveDefaultAssetUuids: false});
			const assetLinks = [];
			for(const defaultAssetConfig of guiValues.defaultAssets){
				assetLinks.push({
					name: defaultAssetConfig.name,
					defaultAssetUuid: defaultAssetConfig.defaultAsset,
					originalUuid: defaultAssetConfig.originalAsset,
				});
			}
			editor.projectManager.assetManager.setDefaultAssetLinks(assetLinks);

			const arrayTreeView = this.treeView.getSerializableStructureEntry("defaultAssets");
			for(const valueItem of arrayTreeView.gui.valueItems){
				this.updateDefaultAssetLinkGui(valueItem.gui);
			}
			this.isParsingValueChange = false;
		});
	}

	updateDefaultAssetLinkGui(objectGui){
		const originalAssetEntry = objectGui.treeView.getSerializableStructureEntry("originalAsset");
		const defaultAssetEntry = objectGui.treeView.getSerializableStructureEntry("defaultAsset");
		const defaultAssetUuid = editor.projectManager.assetManager.getDefaultAssetUuidForOriginal(originalAssetEntry.gui.value);
		defaultAssetEntry.gui.value = defaultAssetUuid;
	}
}
