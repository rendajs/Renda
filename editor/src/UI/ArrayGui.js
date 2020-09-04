import PropertiesTreeView from "./PropertiesTreeView/PropertiesTreeView.js";
import Button from "./Button.js";

export default class ArrayGui{
	constructor({
		value = [],
		arrayTypeOpts = {},
	} = {}){
		this.el = document.createElement("div");
		this.el.classList.add("arrayGui");

		this.valueItems = [];
		this.type = arrayTypeOpts.type || Number;
		this.arrayTypeOpts = arrayTypeOpts;
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

		//initialize array values
		for(const arrayItem of value){
			this.addItem({value: arrayItem});
		}
	}

	get value(){
		const valueArray = [];
		for(const item of this.valueItems){
			valueArray.push(item.gui.value);
		}
		return valueArray;
	}

	destructor(){
		if(this.el.parentElement){
			this.el.parentElement.removeChild(this.el);
		}
		this.el = null;
	}

	addItem(extraArrayTypeOpts = {}){
		const index = this.value.length;
		const addedItem = this.treeView.addItem({
			label: index,
			smallLabel: true,
			type: this.type,
			guiItemOpts: {
				...this.arrayTypeOpts,
				...extraArrayTypeOpts,
			},
		});
		addedItem.onValueChange(_ => {
			this.fireValueChange();
		});
		this.valueItems.push(addedItem);
		this.fireValueChange();
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
