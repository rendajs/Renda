import PropertiesTreeView from "../UI/PropertiesTreeView/PropertiesTreeView.js";

export default class MaterialMapListUi{
	constructor({
		items = [],
	}){
		this.createdMapListUis = new Map();
		this.treeView = new PropertiesTreeView({name: "mapList"});
		for(const item of items){
			const collapsable = this.treeView.addCollapsable(item.name);
			const visibleEntry = collapsable.addItem({
				type: Boolean,
				guiOpts: {
					label: "Visible",
				},
			});
			const mappedNameEntry = collapsable.addItem({
				type: String,
				guiOpts: {
					label: "Mapped Name",
					placeholder: item.name,
				},
			});
			const defaultValueEntry = collapsable.addItem({
				type: item.type,
				guiOpts: {
					label: "Default Value",
				},
			});

			this.createdMapListUis.set(item.name, {visibleEntry, mappedNameEntry, defaultValueEntry})
		}
	}

	destructor(){
		this.treeView.parent.removeChild(this.treeView);
	}

	setValues(values){
		for(const [name, itemData] of Object.entries(values)){
			const mapUi = this.createdMapListUis.get(name);
			if(mapUi){
				const {visibleEntry, mappedNameEntry, defaultValueEntry} = mapUi;
				mappedNameEntry.setValue(itemData.mappedName);
				defaultValueEntry.setValue(itemData.defaultValue);
			}
		}
	}
}
