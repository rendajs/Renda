import PropertiesTreeView from "../UI/PropertiesTreeView/PropertiesTreeView.js";

export default class MaterialMapType{

	//name to be used in the editor ui
	//this should be a string
	static uiName = null;

	//This will be used for storing the map type in the MaterialMap asset.
	//This should have the format "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx".
	//You can generate a uuid in the editor browser console using Util.generateUuid()
	static typeUuid = null;

	constructor(treeView){
		this.treeView = treeView;
	}

	generateMapListUi({
		items = [],
	} = {}){
		const treeView = new PropertiesTreeView({name: "mapList"});
		for(const item of items){
			const collapsable = treeView.addCollapsable(item.name);
			collapsable.addItem({
				type: Boolean,
				guiOpts: {
					label: "Visible",
				},
			});
			collapsable.addItem({
				type: String,
				guiOpts: {
					label: "Mapped Name",
					placeholder: item.name,
				},
			});
			collapsable.addItem({
				type: item.type,
				guiOpts: {
					label: "Default Value",
				},
			});
		}

		return treeView;
	}

	static invalidConfigurationWarning(message){
		console.warn(message+"\nView MaterialMapType.js for more info.");
	}
}
