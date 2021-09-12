import PropertiesTreeView from "./PropertiesTreeView/PropertiesTreeView.js";
import ButtonGroup from "../UI/ButtonGroup.js";
import Button from "./Button.js";

/**
 * @typedef {Object} ArrayGuiArrayOptions
 * @property {import("./PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewEntryType} [type = typeof Number]
 * @property {import("./PropertiesTreeView/PropertiesTreeViewEntry.js").GuiOptions} [guiOpts]
 */

export default class ArrayGui{
	/**
	 *
	 * @param {Object} opts
	 * @param {any[]} [opts.value = []]
	 * @param {ArrayGuiArrayOptions} [opts.arrayOpts = {}]
	 * @param {boolean} [opts.disabled = false]
	 */
	constructor({
		value = [],
		arrayOpts = {},
		disabled = false,
	} = {}){
		this.disabled = false;

		this.el = document.createElement("div");
		this.el.classList.add("arrayGui");

		this.valueItems = [];
		this.type = arrayOpts.type || Number;
		this.arrayOpts = arrayOpts;
		this.onValueChangeCbs = [];

		this.addRemoveButtonGroup = new ButtonGroup();
		this.el.appendChild(this.addRemoveButtonGroup.el);
		this.removeItemButton = new Button({
			text: "-",
			onClick: () => {
				//todo: add support for removing selected entry
				//check if the index exists instead of try catch
				try{
					this.removeItem();
				}catch(e){}
			}
		});
		this.addRemoveButtonGroup.addButton(this.removeItemButton);
		this.addItemButton = new Button({
			text: "+",
			onClick: () => {
				this.addItem();
			}
		});
		this.addRemoveButtonGroup.addButton(this.addItemButton);

		this.treeView = new PropertiesTreeView();
		this.el.appendChild(this.treeView.el);

		this.setValue(value);
		if(disabled) this.setDisabled(true);
	}

	destructor(){
		if(this.el.parentElement){
			this.el.parentElement.removeChild(this.el);
		}
		this.el = null;
	}

	//adds new item to the end of the array
	addItem(extraArrayOpts = {}){
		const index = this.value.length;
		const addedItem = this.treeView.addItem({
			type: this.type,
			guiOpts: {
				smallLabel: true,
				label: "" + index,
				...this.arrayOpts.guiOpts,
				...extraArrayOpts,
			},
		});
		addedItem.onValueChange(() => {
			this.fireValueChange();
		});
		if(this.disabled) addedItem.setDisabled(true);
		this.valueItems.push(addedItem);
		this.fireValueChange();
		return addedItem;
	}

	//remove array item by index, counts from the back when negative
	removeItem(index = -1){
		if(index < 0) index = this.valueItems.length + index;

		if(index < 0 || index >= this.valueItems.length){
			throw new Error(`Failed to remove array item, index ${index} does not exist`);
		}
		this.treeView.removeChildIndex(index);
		this.valueItems.splice(index, 1);
		this.fireValueChange();
	}

	setValue(value, setValueOpts){
		if(!value) value = [];
		const removeCount = this.valueItems.length - value.length;
		if(removeCount > 0){
			for(let i=0; i<removeCount; i++){
				this.removeItem();
			}
		}
		for(const [i, item] of value.entries()){
			const newSetValueOpts = {
				...setValueOpts,
				setOnObject: value,
				setOnObjectKey: i,
			}
			if(this.valueItems.length <= i){
				const addedItem = this.addItem();
				addedItem.setValue(item, newSetValueOpts);
			}else{
				this.valueItems[i].setValue(item, newSetValueOpts);
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

	setDisabled(disabled){
		this.disabled = disabled;
		for(const item of this.valueItems){
			item.setDisabled(disabled);
		}
		this.addItemButton.setDisabled(disabled);
		this.removeItemButton.setDisabled(disabled);
	}
}
