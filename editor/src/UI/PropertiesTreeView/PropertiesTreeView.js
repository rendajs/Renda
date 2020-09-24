import TreeView from "../TreeView.js";
import PropertiesTreeViewEntry from "./PropertiesTreeViewEntry.js";

export default class PropertiesTreeView extends TreeView{
	constructor({
		rowVisible = false,
		name = "",
	} = {}){
		super();
		this.rowVisible = rowVisible;
		this.name = name;
		this.selectable = false;

		this.currentSerializableStructureItems = null;

		this.registerNewEventType("treeViewEntryValueChange");
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
		let item = new PropertiesTreeViewEntry(opts);
		this.addChild(item);
		return item;
	}

	onChildValueChange(cb){
		this.addEventListener("treeViewEntryValueChange", cb);
	}

	generateFromSerializableStructure(structure, {
		callbacksContext = {},
	} = {}){
		this.clearChildren();
		this.currentSerializableStructureItems = {};
		for(const [key, itemSettings] of Object.entries(structure)){
			let guiOpts = {
				label: key,
				...itemSettings?.guiOpts,
			};
			const addedItem = this.addItem({
				...itemSettings,
				guiOpts,
				callbacksContext,
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

	getSerializableStructureValues(structure){
		const values = {};
		let i = 0;
		for(const [key, itemSettings] of Object.entries(structure)){
			const entry = this.children[i++];
			values[key] = entry.value;
		}
		return values;
	}
}
