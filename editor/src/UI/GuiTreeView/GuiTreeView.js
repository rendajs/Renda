import TreeView from "../TreeView.js";
import GuiTreeViewEntry from "./GuiTreeViewEntry.js";

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
		let item = new GuiTreeViewEntry(opts);
		this.addChild(item);
		return item;
	}

	generateFromSerializableStructure(structure){
		this.clearChildren();
		for(const [key, item] of Object.entries(structure)){
			let label = key;
			if(item.label) label = item.label;
			this.addItem({
				label,
				type: item.type,
			});
		}
	}
}
