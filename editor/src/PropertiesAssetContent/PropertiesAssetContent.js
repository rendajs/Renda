import PropertiesTreeView from "../UI/PropertiesTreeView/PropertiesTreeView.js";

export default class PropertiesAssetContent{
	constructor(){
		this.treeView = new PropertiesTreeView();
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
