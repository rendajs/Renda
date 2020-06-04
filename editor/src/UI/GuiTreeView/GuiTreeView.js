import TreeView from "../TreeView.js";
import GuiTreeViewProperty from "./GuiTreeViewProperty.js";

export default class PropertiesTreeView extends TreeView{
	constructor({
		rowVisible = false,
		name = "",
	} = {}){
		super();
		this.rowVisible = rowVisible;
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
		let item = new GuiTreeViewProperty(opts);
		this.addChild(item);
		return item;
	}
}
