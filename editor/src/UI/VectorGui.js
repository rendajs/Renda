import NumericGui from "./NumericGui.js";
import {Vec2, Vec3, Vec4} from "../../../src/index.js";

export default class VectorGui{
	constructor({
		defaultValue = null,
		size = 3,
		disabled = false,
		min = null,
		max = null,
		step = null,
	} = {}){
		if(!defaultValue){
			if(size == 2){
				defaultValue = new Vec2();
			}else if(size == 3){
				defaultValue = new Vec3();
			}else if(size == 4){
				defaultValue = new Vec4();
			}
		}
		this.defaultValue = defaultValue;
		this.el = document.createElement("div");
		this.el.classList.add("vectorGui", "buttonGroupLike");
		this.numericGuis = [];
		this.onValueChangeCbs = [];
		this.disabled = false;
		this.size = size;

		min = this.getGuiOptArray(min);
		max = this.getGuiOptArray(max);
		step = this.getGuiOptArray(step);

		for(let i=0; i<size; i++){
			const numericGui = new NumericGui({
				min: min[0],
				max: max[0],
				step: step[0],
			});
			this.numericGuis.push(numericGui);
			this.el.appendChild(numericGui.el);
			numericGui.onValueChange(() => this.fireValueChange());
		}

		this.setValue(defaultValue);
		this.setDisabled(disabled);
	}

	destructor(){
		if(this.el.parentElement){
			this.el.parentElement.removeChild(this.el);
		}
		this.el = null;
		for(const gui of this.numericGuis){
			gui.destructor();
		}
		this.numericGuis = null;
	}

	getGuiOptArray(value){
		if(Array.isArray(value)) return value;
		if(typeof value == "number" || !value){
			const array = [];
			for(let i=0; i<this.size; i++){
				array.push(value);
			}
			return array;
		}else{
			return value.toArray();
		}
	}

	setValue(vector){
		let arr;
		if(Array.isArray(vector)){
			arr = vector;
		}else{
			arr = vector.toArray();
		}
		for(let [i, gui] of this.numericGuis.entries()){
			gui.setValue(arr[i]);
		}
	}

	onValueChange(cb){
		this.onValueChangeCbs.push(cb);
	}

	getValue({
		getAsArray = false,
		purpose = "default",
	} = {}){
		if(purpose == "fileStorage"){
			getAsArray = true;
		}else if(purpose == "binaryComposer"){
			getAsArray = true;
		}
		let numbersArr = this.numericGuis.map(g => g.value);
		let val = null;
		if(getAsArray){
			val = numbersArr;
		}else if(this.numericGuis.length == 3){
			val = new Vec3(numbersArr);
		}
		return val;
	}

	get value(){
		return this.getValue();
	}

	fireValueChange(){
		for(const cb of this.onValueChangeCbs){
			cb(this.value.clone());
		}
	}

	setDisabled(disabled){
		this.disabled = disabled;
		for(const gui of this.numericGuis){
			gui.setDisabled(disabled);
		}
	}
}
