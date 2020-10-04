import PropertiesTreeView from "./PropertiesTreeView/PropertiesTreeView.js";

export default class ObjectGui{
	constructor(structure){
		this.treeView = new PropertiesTreeView();
		this.treeView.generateFromSerializableStructure(structure);
	}
}
