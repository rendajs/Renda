import TreeView from "../TreeView.js";
import VectorGUI from "../VectorGUI.js";
import NumericGUI from "../NumericGUI.js";
import AssetGUI from "../AssetGUI.js";

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
		this.valueEl.classList.add("propertiesGUIPropertyValue");
		this.customEl.appendChild(this.valueEl);

		if(type.startsWith("vector")){
			let size = parseInt(type.slice(6));
			guiItemOpts.size = size;
			this.gui = new VectorGUI(guiItemOpts);
			this.valueEl.appendChild(this.gui.el);
		}else if(type == "float"){
			this.gui = new NumericGUI(guiItemOpts);
			this.valueEl.appendChild(this.gui.el);
		}else if(type == "asset"){
			this.gui = new AssetGUI(guiItemOpts);
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
		this.gui.setValue(newValue);
	}

	onValueChange(cb){
		if(this.type.startsWith("vector")){
			this.gui.onValueChange(cb);
		}else if(this.type == "float"){
			this.gui.onValueChange(cb);
		}
	}
}
