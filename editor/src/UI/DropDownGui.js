import {prettifyVariableName} from "../Util/Util.js";

export default class DropDownGui{
	constructor({
		items = [],
		defaultValue = null,
		enumObject = null,
		disabled = false,
	} = {}){
		this.items = items;
		this.defaultValue = defaultValue;
		this.disabled = disabled;
		let itemTexts = [...items];
		this.enumObject = enumObject;
		this.inverseEnumObject = null;

		if(enumObject){
			this.inverseEnumObject = {};
			this.items = [];
			itemTexts = [];
			for(const [key, value] of Object.entries(enumObject)){
				this.inverseEnumObject[value] = key;
				this.items.push(key);
				itemTexts.push(prettifyVariableName(key));
			}
		}

		this.el = document.createElement("select");
		this.el.classList.add("textGui", "buttonLike", "resetInput", "textInput");
		for(const [i, option] of itemTexts.entries()){
			const optionEl = document.createElement("option");
			optionEl.value = i;
			optionEl.textContent = option;
			this.el.appendChild(optionEl);
		}

		this.onValueChangeCbs = new Set();
		this.boundFireOnChangeCbs = this.fireOnChangeCbs.bind(this);
		this.el.addEventListener("change", this.boundFireOnChangeCbs);
		this.setValue(defaultValue);
		this.setDisabled(disabled);
	}

	destructor(){
		this.el.removeEventListener("change", this.boundFireOnChangeCbs);
		this.boundFireOnChangeCbs = null;
	}

	setValue(value){
		if(this.enumObject){
			if(typeof value != "string"){
				value = this.inverseEnumObject[value];
			}
		}
		const index = this.items.indexOf(value);
		if(index >= 0){
			this.el.value = "" + index;
		}else{
			this.el.value = null;
		}
	}

	get value(){
		return this.getValue();
	}

	/**
	 * @param {Object} opts
	 * @param {boolean} [opts.getAsString = false]
	 * @param {import("./PropertiesTreeView/PropertiesTreeView.js").SerializableStructureOutputPurpose} [opts.purpose = "default"]
	 */
	getValue({
		getAsString = false,
		purpose = "default",
	} = {}){
		if(purpose == "fileStorage"){
			getAsString = true;
		}else if(purpose == "binaryComposer"){
			getAsString = false;
		}
		let value = this.items[this.el.value];
		if(this.enumObject && !getAsString){
			value = this.enumObject[value];
		}
		return value;
	}

	onValueChange(cb){
		this.onValueChangeCbs.add(cb);
	}

	fireOnChangeCbs(){
		for(const cb of this.onValueChangeCbs){
			cb(this.value);
		}
	}

	setDisabled(disabled){
		this.disabled = disabled;
		this.el.disabled = disabled;
	}
}
