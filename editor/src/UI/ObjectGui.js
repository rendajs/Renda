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

	get value(){
		return this.treeView.getSerializableStructureValues(this.structure);
	}

	setValue(value){
		this.treeView.fillSerializableStructureValues(value);
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
