import NumericGUI from "./NumericGUI.js";

export default class VectorGUI{
	constructor({
		size = 3,
	} = {}){
		this.el = document.createElement("div");
		this.el.classList.add("vectorGUI", "buttonGroupLike");
		this.numericGuis = [];

		for(let i=0; i<size; i++){
			let numericGui = new NumericGUI();
			this.numericGuis.push(numericGui);
			this.el.appendChild(numericGui.el);
		}
	}
}
