import PropertiesTreeView from "./PropertiesTreeView/PropertiesTreeView.js";

export default class ObjectGui{
	constructor({
		structure = {},
		value = {},
	} = {}){
		this.structure = structure;
		this.treeView = new PropertiesTreeView();
		this.treeView.generateFromSerializableStructure(structure);
		this.onValueChangeCbs = new Set();
		this.treeView.onChildValueChange(_ => {
			this.fireValueChange();
		});

		this.setValue(value);
	}

	setValue(value){
		this.treeView.fillSerializableStructureValues(value);
	}

	getValue(guiOpts){
		return this.treeView.getSerializableStructureValues(this.structure, guiOpts);
	}

	get value(){
		return this.getValue();
	}

	onValueChange(cb){
		this.onValueChangeCbs.add(cb);
	}

	fireValueChange(){
		const value = this.value;
		for(const cb of this.onValueChangeCbs){
			cb(value);
		}
	}
}
