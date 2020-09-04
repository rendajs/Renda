import TreeView from "../TreeView.js";
import VectorGui from "../VectorGui.js";
import NumericGui from "../NumericGui.js";
import TextGui from "../TextGui.js";
import AssetGui from "../AssetGui.js";
import ArrayGui from "../ArrayGui.js";

import {Vector3, Mesh, Material} from "../../../../src/index.js";

export default class PropertiesTreeViewEntry extends TreeView{
	constructor({
		label = "",
		smallLabel = false,
		type = Number,
		guiItemOpts = {},
	} = {}){
		super({
			addCustomEl: true,
		});

		this.rowVisible = false;
		this.selectable = false;

		this.customEl.classList.add("guiTreeViewEntry");

		this.label = document.createElement("div");
		this.label.classList.add("guiTreeViewEntryLabel");
		this.label.classList.toggle("smallLabel", smallLabel);
		this.label.textContent = label;
		this.customEl.appendChild(this.label);

		this.valueEl = document.createElement("div");
		this.valueEl.classList.add("guiTreeViewEntryValue");
		this.valueEl.classList.toggle("smallLabel", smallLabel);
		this.customEl.appendChild(this.valueEl);

		if(type == "string"){
			this.gui = new TextGui(guiItemOpts);
			this.valueEl.appendChild(this.gui.el);
		}else if(type == Vector3){
			guiItemOpts.size = 3;
			this.gui = new VectorGui(guiItemOpts);
			this.valueEl.appendChild(this.gui.el);
		}else if(type == Number){
			this.gui = new NumericGui(guiItemOpts);
			this.valueEl.appendChild(this.gui.el);
		}else if(type == Mesh || type == Material){ //todo make this list more scalable
			this.gui = new AssetGui(guiItemOpts);
			this.valueEl.appendChild(this.gui.el);
		}else if(type == Array){
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
		this.gui?.setValue?.(newValue);
	}

	onValueChange(cb){
		this.gui?.onValueChange?.(cb);
	}
}
