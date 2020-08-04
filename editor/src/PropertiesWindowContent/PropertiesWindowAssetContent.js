import PropertiesWindowContent from "./PropertiesWindowContent.js";
// import {Entity, Vector3, defaultComponentTypeManager, Mesh} from "../../../src/index.js";
import GuiTreeView from "../UI/GuiTreeView/GuiTreeView.js";
import Button from "../UI/Button.js";
import editor from "../editorInstance.js";
import ProjectAsset from "../Assets/ProjectAsset.js";

export default class PropertiesWindowAssetContent extends PropertiesWindowContent{
	constructor(){
		super();

		this.currentSelection = null;
		this.activeAssetContent = null;

		this.treeView = new GuiTreeView();
		this.el.appendChild(this.treeView.el);

		this.assetSettingsTree = this.treeView.addCollapsable("Asset settings will be placed here");
		this.assetContentTree = this.treeView.addCollapsable("Asset content will be placed here");
	}

	destructor(){
		this.treeView.destructor();
		this.assetSettingsTree = null;
		this.assetContentTree = null;
		super.destructor();
	}

	static get useForTypes(){
		return [ProjectAsset];
	}

	selectionChanged(selectedObjects){
		this.currentSelection = selectedObjects;
		this.updateAssetContent();
	}

	onAssetContentTypeRegistered(constructor){
		this.updateAssetContent();
	}

	//todo: make sure only one instance runs at a time
	async updateAssetContent(){
		let constructor = null;
		for(const projectAsset of this.currentSelection){
			const constructorFromAsset = await projectAsset.getPropertiesAssetContentConstructor();
			if(constructorFromAsset){
				constructor = constructorFromAsset;
				break;
			}
		}
		const needsNew = constructor && (!this.activeAssetContent || this.activeAssetContent.constructor != constructor);
		if(needsNew || (!constructor && this.activeAssetContent)){
			if(this.activeAssetContent) this.activeAssetContent.destructor();
			this.activeAssetContent = null;
			this.assetContentTree.clearChildren();
		}
		if(needsNew){
			this.activeAssetContent = new constructor();
			this.assetContentTree.addChild(this.activeAssetContent.treeView);
		}
		if(this.activeAssetContent) this.activeAssetContent.updateAll(this.currentSelection);
	}
}
