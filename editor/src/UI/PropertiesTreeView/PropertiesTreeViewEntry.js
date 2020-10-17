import editor from "../../editorInstance.js";
import TreeView from "../TreeView.js";
import VectorGui from "../VectorGui.js";
import NumericGui from "../NumericGui.js";
import BooleanGui from "../BooleanGui.js";
import TextGui from "../TextGui.js";
import DroppableGui from "../DroppableGui.js";
import ArrayGui from "../ArrayGui.js";
import Button from "../Button.js";
import ObjectGui from "../ObjectGui.js";

import ProjectAsset from "../../Assets/ProjectAsset.js";
import {Vec3, Mesh, Material} from "../../../../src/index.js";

export default class PropertiesTreeViewEntry extends TreeView{
	constructor({
		type = Number,
		guiOpts = {},
		arrayOpts = {},
		callbacksContext = {},
	} = {}){
		super({
			addCustomEl: true,
		});

		this.rowVisible = false;
		this.selectable = false;

		this.customEl.classList.add("guiTreeViewEntry");

		const smallLabel = guiOpts.smallLabel ?? false;
		this.label = document.createElement("div");
		this.label.classList.add("guiTreeViewEntryLabel");
		this.label.classList.toggle("smallLabel", smallLabel);
		this.label.textContent = guiOpts.label ?? "";
		this.customEl.appendChild(this.label);

		this.valueEl = document.createElement("div");
		this.valueEl.classList.add("guiTreeViewEntryValue");
		this.valueEl.classList.toggle("smallLabel", smallLabel);
		this.customEl.appendChild(this.valueEl);

		//todo: also allow type to be a string

		this.type = type;
		if(type == String){
			this.gui = new TextGui(guiOpts);
			this.valueEl.appendChild(this.gui.el);
		}else if(type == Vec3){
			guiOpts.size = 3;
			this.gui = new VectorGui(guiOpts);
			this.valueEl.appendChild(this.gui.el);
		}else if(type == Number){
			this.gui = new NumericGui(guiOpts);
			this.valueEl.appendChild(this.gui.el);
		}else if(type == Boolean){
			this.gui = new BooleanGui(guiOpts);
			this.valueEl.appendChild(this.gui.el);
		}else if(type == Array){
			this.gui = new ArrayGui({
				arrayOpts,
				...guiOpts,
			});
			this.valueEl.appendChild(this.gui.el);
			this.label.classList.add("multiLine");
			this.valueEl.classList.add("multiLine");
		}else if(type && type.constructor == Object){
			this.gui = new ObjectGui({
				structure: type,
				...guiOpts,
			});
			this.valueEl.appendChild(this.gui.treeView.el);
			this.label.classList.add("multiLine");
			this.valueEl.classList.add("multiLine");
		}else if(type == "button"){
			this.gui = new Button({
				...guiOpts,
				onClick: _ => {
					if(guiOpts.onClick) guiOpts.onClick(callbacksContext);
				},
			});
			this.valueEl.appendChild(this.gui.el);
		}else if(type == ProjectAsset || editor.projectAssetTypeManager.constructorHasAssetType(type)){
			this.gui = new DroppableGui({
				supportedAssetTypes: [type],
				...guiOpts,
			});
			this.valueEl.appendChild(this.gui.el);
		}

		//todo: maybe instead of calling setvalue inside the constructor
		//of every gui class, call setValue over here

		this.registerNewEventType("treeViewEntryValueChange");
		this.gui?.onValueChange?.(newValue => {
			this.fireEvent("treeViewEntryValueChange", {
				changedEntry: this,
				newValue,
			});
		});
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

	get value(){
		return this.gui?.value;
	}
}
