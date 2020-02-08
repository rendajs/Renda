import TreeView from "../TreeView.js";
import PropertiesTreeViewProperty from "./PropertiesTreeViewProperty.js";

export default class PropertiesTreeView extends TreeView{
	constructor({
		rowVisible = false,
		name = "",
	} = {}){
		super();
		this.setRowVisible(rowVisible);
		this.name = name;
		this.selectable = false;
	}

	addCollapsable(name){
		let newTreeView = new PropertiesTreeView({
			rowVisible: true,
			name,
		});
		this.addChild(newTreeView);
		return newTreeView;
	}

	addItem(opts){
		let item = new PropertiesTreeViewProperty(opts);
		this.addChild(item);
		return item;
	}
}
