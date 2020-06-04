import TreeView from "../TreeView.js";
import VectorGui from "../VectorGui.js";
import NumericGui from "../NumericGui.js";
import AssetGui from "../AssetGui.js";
import ArrayGui from "../ArrayGui.js";

export default class PropertiesTreeViewProperty extends TreeView{
	constructor({
		label = "",
		type = "",
		guiItemOpts = {},
	} = {}){
		super({
			addCustomEl: true,
		});
		type = type.toLowerCase();
		this.type = type;

		this.rowVisible = false;
		this.selectable = false;

		this.customEl.classList.add("propertiesTreeViewProperty");

		this.label = document.createElement("div");
		this.label.classList.add("propertiesTreeViewPropertyLabel");
		this.label.textContent = label;
		this.customEl.appendChild(this.label);

		this.valueEl = document.createElement("div");
		this.valueEl.classList.add("propertiesGuiPropertyValue");
		this.customEl.appendChild(this.valueEl);

		if(type.startsWith("vector")){
			let size = parseInt(type.slice(6));
			guiItemOpts.size = size;
			this.gui = new VectorGui(guiItemOpts);
			this.valueEl.appendChild(this.gui.el);
		}else if(type == "float"){
			this.gui = new NumericGui(guiItemOpts);
			this.valueEl.appendChild(this.gui.el);
		}else if(type == "asset"){
			this.gui = new AssetGui(guiItemOpts);
			this.valueEl.appendChild(this.gui.el);
		}else if(type == "array"){
			this.gui = new ArrayGui(guiItemOpts);
			this.valueEl.appendChild(this.gui.el);
		}
	}

	destructor(){
		this.label = null;
		this.valueEl = null;
		if(this.gui) this.gui.destructor();
		this.gui = null;
		super.destructor();
	}

	setValue(newValue){
		if(this.gui && this.gui.setValue){
			this.gui.setValue(newValue);
		}
	}
}
