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

		this.serializableStructure = null;
		this.currentSerializableStructureItems = null;
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
		this.currentSerializableStructureItems = {};
		for(const [key, itemSettings] of Object.entries(structure)){
			let label = key;
			if(itemSettings.label) label = itemSettings.label;
			const addedItem = this.addItem({
				label,
				type: itemSettings.type,
			});
			this.currentSerializableStructureItems[key] = addedItem;
		}
	}

	fillSerializableStructureValues(values){
		for(const [key, value] of Object.entries(values)){
			const item = this.currentSerializableStructureItems[key];
			item.setValue(value);
		}
	}
}
