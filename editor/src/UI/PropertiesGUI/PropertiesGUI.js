import PropertiesGUICollapsable from "./PropertiesGUICollapsable.js";
import PropertiesGUIProperty from "./PropertiesGUIProperty.js";

export default class PropertiesGUI{
	constructor(){
		this.el = document.createElement("div");
		this.el.classList.add("propertiesGUI");
	}

	addItem(item){
		this.el.appendChild(item.el);
	}

	addProperty(opts){
		let property = new PropertiesGUIProperty(opts);
		this.addItem(property);
		return property;
	}

	addCollapsable(opts){
		let collapsable = new PropertiesGUICollapsable(opts);
		this.addItem(collapsable);
		return collapsable;
	}
}
