import TreeView from "./TreeView.js";

export default class ArrayGui{
	constructor({
	} = {}){
		this.el = document.createElement("div");
		this.el.classList.add("arrayGui");

		this.treeView = new TreeView();
	}

	destructor(){
		if(this.el.parentElement){
			this.el.parentElement.removeChild(this.el);
		}
		this.el = null;
	}
}
