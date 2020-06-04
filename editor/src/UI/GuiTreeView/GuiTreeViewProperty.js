import TreeView from "../TreeView.js";
import VectorGui from "../VectorGui.js";
import NumericGui from "../NumericGui.js";
import AssetGui from "../AssetGui.js";
import ArrayGui from "../ArrayGui.js";

export default class GuiTreeViewProperty extends TreeView{
	constructor({
		label = "",
		smallLabel = false,
		type = "float",
		guiItemOpts = {},
	} = {}){
		super({
			addCustomEl: true,
		});
		type = type.toLowerCase();
		this.type = type;

		this.rowVisible = false;
		this.selectable = false;

		this.customEl.classList.add("guiTreeViewProperty");

		this.label = document.createElement("div");
		this.label.classList.add("guiTreeViewPropertyLabel");
		this.label.classList.toggle("smallLabel", smallLabel);
		this.label.textContent = label;
		this.customEl.appendChild(this.label);

		this.valueEl = document.createElement("div");
		this.valueEl.classList.add("guiTreeViewPropertyValue");
		this.valueEl.classList.toggle("smallLabel", smallLabel);
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
			this.label.classList.add("multiLine");
			this.valueEl.classList.add("multiLine");
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
