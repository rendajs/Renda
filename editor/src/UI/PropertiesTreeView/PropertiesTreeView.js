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
		this.fullTreeDisabled = false;

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
		if(this.fullTreeDisabled) item.setDisabled(true);
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
		if(!values) return;
		for(const [key, value] of Object.entries(values)){
			const item = this.currentSerializableStructureItems[key];
			item?.setValue(value);
		}
	}

	//guiOpts has the following possible values:
	// - "default" uses the default behaviour of PropertiesTreeViewEntries
	// - "fileStorage" optimizes for data stored as json in project asset files
	// - "binaryComposer" optimizes for data passed to BinaryComposer.objectToBinary
	// - "script" optimizes for how in game scripts are most likely to access the data (e.g. Entity Components)
	getSerializableStructureValues(structure, guiOpts){
		const values = {};
		let i = 0;
		for(const [key, itemSettings] of Object.entries(structure)){
			const entry = this.children[i++];
			if(!entry.omitFromSerializableStuctureValues(guiOpts)){
				values[key] = entry.getValue(guiOpts);
			}
		}
		return values;
	}

	getSerializableStructureEntry(key){
		return this.currentSerializableStructureItems[key];
	}

	getSerializableStructureKeyForEntry(treeViewEntry){
		for(const [key, entry] of Object.entries(this.currentSerializableStructureItems)){
			if(treeViewEntry == entry){
				return key;
			}
		}
	}

	setFullTreeDisabled(disabled){
		this.fullTreeDisabled = disabled;
		for(const child of this.children){
			child.setDisabled(disabled);
		}
	}
}
