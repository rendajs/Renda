import NumericGui from "./NumericGui.js";
import {Vector3} from "../../../../src/index.js";

export default class VectorGui{
	constructor({
		size = 3,
	} = {}){
		this.el = document.createElement("div");
		this.el.classList.add("vectorGui", "buttonGroupLike");
		this.numericGuis = [];
		this.onValueChangeCbs = [];

		for(let i=0; i<size; i++){
			let numericGui = new NumericGui();
			this.numericGuis.push(numericGui);
			this.el.appendChild(numericGui.el);
			numericGui.onValueChange(_ => this.fireValueChange());
		}
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

	setValue(vector){
		let arr = vector.toArray();
		for(let [i, gui] of this.numericGuis.entries()){
			gui.setValue(arr[i]);
		}
	}

	onValueChange(cb){
		this.onValueChangeCbs.push(cb);
	}

	fireValueChange(){
		let newValueArr = this.numericGuis.map(g => g.value);
		let newValue = null;
		if(this.numericGuis.length == 3){
			newValue = new Vector3(newValueArr);
		}
		for(const cb of this.onValueChangeCbs){
			cb(newValue.clone());
		}
	}
}
