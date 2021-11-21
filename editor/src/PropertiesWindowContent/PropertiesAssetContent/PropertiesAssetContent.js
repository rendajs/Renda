import {PropertiesTreeView} from "../../UI/PropertiesTreeView/PropertiesTreeView.js";

export class PropertiesAssetContent {
	constructor() {
		this.currentSelection = [];
		this.treeView = new PropertiesTreeView();
	}

	destructor() {
		if (this.el) {
			if (this.el.parentElement) {
				this.el.parentElement.removeChild(this.el);
			}
			this.el = null;
		}
	}

	selectionUpdated(currentSelection) {
		this.currentSelection = currentSelection;
	}
}
