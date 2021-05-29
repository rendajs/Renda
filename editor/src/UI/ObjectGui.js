import PropertiesTreeView from "./PropertiesTreeView/PropertiesTreeView.js";

export default class ObjectGui{
	constructor({
		structure = {},
		value = {},
		disabled = false,
	} = {}){
		this.disabled = disabled;
		this.structure = structure;
		this.treeView = new PropertiesTreeView();
		this.treeView.generateFromSerializableStructure(structure);
		this.onValueChangeCbs = new Set();
		this.treeView.onChildValueChange(() => {
			this.fireValueChange();
		});

		this.setValue(value);
		this.setDisabled(disabled);
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

	setDisabled(disabled){
		this.disabled = disabled;
		this.treeView.setFullTreeDisabled(disabled);
	}
}
