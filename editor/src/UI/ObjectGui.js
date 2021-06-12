import PropertiesTreeView from "./PropertiesTreeView/PropertiesTreeView.js";

export default class ObjectGui{
	constructor({
		structure = {},
		value = {},
		disabled = false,
	} = {}){
		this.disabled = false;
		this.structure = structure;
		this.treeView = new PropertiesTreeView();
		this.treeView.generateFromSerializableStructure(structure);
		this.onValueChangeCbs = new Set();
		this.treeView.onChildValueChange(() => {
			this.fireValueChange();
		});

		this.setValue(value);
		if(disabled) this.setDisabled(true);
	}

	setValue(value, setValueOpts){
		this.treeView.fillSerializableStructureValues(value, setValueOpts);
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
