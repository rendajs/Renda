import PropertiesTreeView from "./PropertiesTreeView/PropertiesTreeView.js";
import Button from "./Button.js";

export default class ArrayGui{
	constructor({
		value = [],
		arrayOpts = {},
	} = {}){
		this.el = document.createElement("div");
		this.el.classList.add("arrayGui");

		this.valueItems = [];
		this.type = arrayOpts.type || Number;
		this.arrayOpts = arrayOpts;
		this.onValueChangeCbs = [];

		this.treeView = new PropertiesTreeView();
		this.el.appendChild(this.treeView.el);

		this.addItemButton = new Button({
			text: "Add Item",
			onClick: _ => {
				this.addItem();
			}
		});
		this.el.appendChild(this.addItemButton.el);

		this.setValue(value);
	}

	destructor(){
		if(this.el.parentElement){
			this.el.parentElement.removeChild(this.el);
		}
		this.el = null;
	}

	addItem(extraArrayOpts = {}){
		const index = this.value.length;
		const addedItem = this.treeView.addItem({
			type: this.type,
			guiOpts: {
				smallLabel: true,
				label: index,
				...this.arrayOpts.guiOpts,
				...extraArrayOpts,
			},
		});
		addedItem.onValueChange(_ => {
			this.fireValueChange();
		});
		this.valueItems.push(addedItem);
		this.fireValueChange();
	}

	setValue(value){
		for(const [i, item] of value.entries()){
			if(this.valueItems.length <= i){
				this.addItem({value: item});
			}else{
				this.valueItems.setValue(item);
			}
		}
	}

	getValue(guiOpts){
		const valueArray = [];
		for(const item of this.valueItems){
			let value = null;
			if(item.gui.getValue){
				value = item.gui.getValue(guiOpts);
			}else{
				value = item.gui.value;
			}
			valueArray.push(value);
		}
		return valueArray;
	}

	get value(){
		return this.getValue();
	}

	onValueChange(cb){
		this.onValueChangeCbs.push(cb);
	}

	fireValueChange(){
		for(const cb of this.onValueChangeCbs){
			cb(this.value);
		}
	}
}
