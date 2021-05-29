import NumericGui from "./NumericGui.js";
import {Vec3} from "../../../src/index.js";

export default class VectorGui{
	constructor({
		size = 3,
		disabled = false,
	} = {}){
		this.el = document.createElement("div");
		this.el.classList.add("vectorGui", "buttonGroupLike");
		this.numericGuis = [];
		this.onValueChangeCbs = [];
		this.disabled = false;

		for(let i=0; i<size; i++){
			let numericGui = new NumericGui();
			this.numericGuis.push(numericGui);
			this.el.appendChild(numericGui.el);
			numericGui.onValueChange(() => this.fireValueChange());
		}

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

	setDisabled(disabled){
		this.disabled = disabled;
		for(const gui of this.numericGuis){
			gui.setDisabled(disabled);
		}
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

	get value(){
		let numbersArr = this.numericGuis.map(g => g.value);
		let val = null;
		if(this.numericGuis.length == 3){
			val = new Vec3(numbersArr);
		}
		return val;
	}

	fireValueChange(){
		for(const cb of this.onValueChangeCbs){
			cb(this.value.clone());
		}
	}
}
