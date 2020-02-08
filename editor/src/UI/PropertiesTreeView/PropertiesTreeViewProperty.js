import TreeView from "../TreeView.js";
import VectorGUI from "../VectorGUI.js";

export default class PropertiesTreeViewProperty extends TreeView{
	constructor({
		label = "",
		type = "",
	} = {}){
		super({
			addCustomEl: true,
		});
		this.setRowVisible(false);
		this.selectable = false;

		this.customEl.classList.add("propertiesTreeViewProperty");

		this.label = document.createElement("div");
		this.label.classList.add("propertiesTreeViewPropertyLabel");
		this.label.textContent = label;
		this.customEl.appendChild(this.label);

		this.valueEl = document.createElement("div");
		this.valueEl.classList.add("propertiesGUIPropertyValue");
		this.customEl.appendChild(this.valueEl);

		let vector = new VectorGUI();
		this.valueEl.appendChild(vector.el);
	}
}
