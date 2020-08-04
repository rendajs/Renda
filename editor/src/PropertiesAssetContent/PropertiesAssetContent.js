import GuiTreeView from "../UI/GuiTreeView/GuiTreeView.js";

export default class PropertiesAssetContent{
	constructor(){
		this.treeView = new GuiTreeView();
	}

	destructor(){
		if(this.el){
			if(this.el.parentElement){
				this.el.parentElement.removeChild(this.el);
			}
			this.el = null;
		}
	}

	updateAll(){}
}
