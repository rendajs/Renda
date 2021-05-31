import editor from "../../editorInstance.js";
import TreeView from "../TreeView.js";
import VectorGui from "../VectorGui.js";
import NumericGui from "../NumericGui.js";
import BooleanGui from "../BooleanGui.js";
import DropDownGui from "../DropDownGui.js";
import TextGui from "../TextGui.js";
import DroppableGui from "../DroppableGui.js";
import ArrayGui from "../ArrayGui.js";
import Button from "../Button.js";
import ObjectGui from "../ObjectGui.js";

import ProjectAsset from "../../Assets/ProjectAsset.js";
import {Vec3, Mesh, Material} from "../../../../src/index.js";
import {prettifyVariableName} from "../../Util/Util.js";

export default class PropertiesTreeViewEntry extends TreeView{
	constructor({
		type = Number,
		defaultValue = undefined,
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
		this.label.textContent = prettifyVariableName(guiOpts.label) ?? "";
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
			this.gui = new VectorGui({
				defaultValue,
				...guiOpts,
			});
			this.valueEl.appendChild(this.gui.el);
		}else if(type == Number){
			this.gui = new NumericGui({
				defaultValue,
				...guiOpts,
			});
			this.valueEl.appendChild(this.gui.el);
		}else if(type == Boolean){
			this.gui = new BooleanGui({
				defaultValue,
				...guiOpts,
			});
			this.valueEl.appendChild(this.gui.el);
		}else if(Array.isArray(type)){
			this.gui = new DropDownGui({
				items: type,
				defaultValue,
				...guiOpts,
			});
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
				onClick: () => {
					if(guiOpts.onClick) guiOpts.onClick(callbacksContext);
				},
			});
			this.valueEl.appendChild(this.gui.el);
		}else if(editor.projectAssetTypeManager.constructorHasAssetType(type) || type == ProjectAsset){
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
		this.gui?.destructor?.();
		this.gui = null;
		super.destructor();
	}

	setDisabled(disabled){
		this.gui?.setDisabled?.(disabled);
	}

	setValue(newValue){
		this.gui?.setValue?.(newValue);
	}

	onValueChange(cb){
		this.gui?.onValueChange?.(cb);
	}

	get value(){
		return this.getValue();
	}

	getValue(guiOpts){
		if(this.gui.getValue){
			return this.gui.getValue(guiOpts);
		}else{
			return this.gui?.value;
		}
	}

	//if this, returns false, the value be omitted from getSerializableStructureValues
	//useful for entries such as buttons, labels, etc.
	omitFromSerializableStuctureValues(guiOpts){
		if(this.gui instanceof Button){
			return true;
		}
		if(guiOpts && guiOpts.stripDefaultValues || guiOpts.purpose == "fileStorage"){
			if(this.gui.isDefaultValue){
				if(this.gui.isDefaultValue(guiOpts)) return true;
			}else{
				if(this.gui.value == this.gui.defaultValue) return true;
			}
		}
		return false;
	}
}
