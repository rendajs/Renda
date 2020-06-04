import GuiTreeView from "./GuiTreeView/GuiTreeView.js";
import Button from "./Button.js";

export default class ArrayGui{
	constructor({
		value = [],
		arrayTypeOpts = {},
	} = {}){
		this.el = document.createElement("div");
		this.el.classList.add("arrayGui");

		this.value = value;
		this.arrayTypeOpts = arrayTypeOpts;

		this.treeView = new GuiTreeView();
		this.el.appendChild(this.treeView.el);

		this.addItemButton = new Button({
			text: "Add Item",
			onClick: _ => {
				this.addItem();
			}
		});
		this.el.appendChild(this.addItemButton.el);
	}

	destructor(){
		if(this.el.parentElement){
			this.el.parentElement.removeChild(this.el);
		}
		this.el = null;
	}

	addItem(){
		const index = this.value.length;
		this.treeView.addItem({
			label: index,
			smallLabel: true,
			...this.arrayTypeOpts,
		});
		this.value.push(null);
	}
}
