import PropertiesWindowContent from "./PropertiesWindowContent.js";
import PropertiesTreeView from "../UI/PropertiesTreeView/PropertiesTreeView.js";
import Button from "../UI/Button.js";
import editor from "../editorInstance.js";
import ProjectAsset from "../Assets/ProjectAsset.js";
import PropertiesAssetContentGenericStructure from "../PropertiesAssetContent/PropertiesAssetContentGenericStructure.js";

export default class PropertiesWindowAssetContent extends PropertiesWindowContent{
	constructor(){
		super();

		this.currentSelection = null;
		this.activeAssetContent = null;
		this.activeAssetSettingsStructureUi = null;

		this.treeView = new PropertiesTreeView();
		this.el.appendChild(this.treeView.el);

		this.assetSettingsTree = this.treeView.addCollapsable("Asset settings will be placed here");
		this.assetContentTree = this.treeView.addCollapsable("Asset content will be placed here");
	}

	destructor(){
		this.treeView.destructor();
		this.assetSettingsTree = null;
		this.assetContentTree = null;
		if(this.activeAssetSettingsStructureUi) this.activeAssetSettingsStructureUi.destructor();
		super.destructor();
	}

	static get useForTypes(){
		return [ProjectAsset];
	}

	selectionChanged(selectedObjects){
		this.currentSelection = selectedObjects;
		this.updateAssetSettings();
		this.updateAssetContent();
	}

	onAssetContentTypeRegistered(constructor){
		this.updateAssetContent();
	}

	async updateAssetSettings(){
		if(this.activeAssetSettingsStructureUi){
			this.activeAssetSettingsStructureUi.destructor();
			this.activeAssetSettingsStructureUi = null;
		}

		let settingsStructure = {};
		let settingsValues = {};

		for(const projectAsset of this.currentSelection){
			const structure = await projectAsset.getPropertiesAssetSettingsStructure();
			const values = projectAsset.assetSettings;
			//todo: handle selecting multiple assets
			if(structure){
				settingsStructure = structure;
				settingsValues = values;
				break;
			}
		}

		this.assetSettingsTree.generateFromSerializableStructure(settingsStructure, {
			callbacksContext: {
				selectedAssets: this.currentSelection
			},
		});
		this.assetSettingsTree.fillSerializableStructureValues(settingsValues);
	}

	//todo: make sure only one instance runs at a time
	async updateAssetContent(){
		let foundStructure = null;
		let foundStructureType = null;
		let foundConstructor = null;
		for(const projectAsset of this.currentSelection){
			const structureFromAsset = await projectAsset.getPropertiesAssetContentStructure();
			if(structureFromAsset){
				const assetType = await projectAsset.getProjectAssetType();
				if(foundStructureType && foundStructureType != assetType){
					continue;
				}
				foundStructure = structureFromAsset;
				foundStructureType = assetType;
			}else if(!foundStructure && !foundConstructor){
				foundConstructor = await projectAsset.getPropertiesAssetContentConstructor();
			}
		}

		let constructor = foundConstructor;
		if(foundStructure){
			constructor = PropertiesAssetContentGenericStructure;
		}

		const needsNew = constructor && (!this.activeAssetContent || this.activeAssetContent.constructor != constructor);
		if(needsNew || (!constructor && this.activeAssetContent)){
			if(this.activeAssetContent) this.activeAssetContent.destructor();
			this.activeAssetContent = null;
			this.assetContentTree.clearChildren();
		}
		if(needsNew){
			this.activeAssetContent = new constructor(foundStructure);
			this.assetContentTree.addChild(this.activeAssetContent.treeView);
		}
		if(this.activeAssetContent){
			this.activeAssetContent.selectionUpdated(this.currentSelection);
		}
	}
}
