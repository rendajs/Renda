import {prettifyVariableName} from "../Util/Util.js";

export default class DropDownGui{
	constructor({
		items = [],
		defaultValue = null,
		enumObject = null,
	} = {}){
		this.items = items;
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
			this.el.value = index;
		}else{
			this.el.value = null;
		}
	}

	get value(){
		return this.getValue();
	}

	getValue({
		convertEnumsToString = false,
	} = {}){
		let value = this.items[this.el.value];
		if(this.enumObject && !convertEnumsToString){
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
}
