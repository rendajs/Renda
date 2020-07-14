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

	updateAssetContent(){
		let PropertiesAssetContent = editor.propertiesAssetContentManager.getContentTypeForObjects(this.currentSelection);
		if(!this.activeAssetContent || this.activeAssetContent.constructor != PropertiesAssetContent){
			if(this.activeAssetContent) this.activeAssetContent.destructor();
			if(PropertiesAssetContent){
				this.activeAssetContent = new PropertiesAssetContent();
			}

			//todo: add created assetcontent to assetContentTree
		}
		if(this.activeAssetContent) this.activeAssetContent.updateAll(this.currentSelection);
	}
}
