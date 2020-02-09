import TreeView from "../TreeView.js";
import VectorGUI from "../VectorGUI.js";

export default class PropertiesTreeViewProperty extends TreeView{
	constructor({
		label = "",
		type = "",
	} = {}){
		super({
			addCustomEl: true,
		});
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

		if(type.startsWith("Vector")){
			this.gui = new VectorGUI();
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
		if(this.type.startsWith("Vector")){
			this.gui.onValueChange(cb);
		}
	}
}
