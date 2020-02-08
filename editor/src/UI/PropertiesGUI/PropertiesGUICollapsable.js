import PropertiesGUIItem from "./PropertiesGUIItem.js";

export default class PropertiesGUICollapsable extends PropertiesGUIItem{
	constructor({
		displayName = "",
	} = {}){
		super();
		this.el.classList.add("propertiesGUICollapsable");
	}
}
