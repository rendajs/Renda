import PropertiesGUIItem from "./PropertiesGUIItem.js";
import VectorGUI from "../VectorGUI.js";

export default class PropertiesGUIProperty extends PropertiesGUIItem{
	constructor({
		label = "",
	} = {}){
		super();

		this.el.classList.add("propertiesGUIProperty");

		this.label = document.createElement("div");
		this.label.classList.add("propertiesGUIPropertyLabel");
		this.label.textContent = label;
		this.el.appendChild(this.label);

		this.valueEl = document.createElement("div");
		this.valueEl.classList.add("propertiesGUIPropertyValue");
		this.el.appendChild(this.valueEl);

		let vector = new VectorGUI();
		this.valueEl.appendChild(vector.el);
	}
}
