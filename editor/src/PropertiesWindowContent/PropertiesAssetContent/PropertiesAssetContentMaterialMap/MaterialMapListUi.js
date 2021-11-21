import {PropertiesTreeView} from "../../../UI/PropertiesTreeView/PropertiesTreeView.js";

export class MaterialMapListUi {
	constructor({
		items = [],
	}) {
		this.createdMapListUis = new Map();
		this.treeView = new PropertiesTreeView({name: "mapList"});
		for (const item of items) {
			const collapsable = this.treeView.addCollapsable(item.name);
			const visibleEntry = collapsable.addItem({
				type: "boolean",
				guiOpts: {
					label: "Visible",
				},
			});
			const mappedNameEntry = collapsable.addItem({
				type: "string",
				/** @type {import("../../../UI/TextGui.js").TextGuiOptions} */
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

			this.createdMapListUis.set(item.name, {visibleEntry, mappedNameEntry, defaultValueEntry});
		}
	}

	destructor() {
		this.treeView.parent.removeChild(this.treeView);
	}

	setValues(values) {
		for (const [name, itemData] of Object.entries(values)) {
			const mapUi = this.createdMapListUis.get(name);
			if (mapUi) {
				const {visibleEntry, mappedNameEntry, defaultValueEntry} = mapUi;
				if (itemData.visible !== undefined) {
					visibleEntry.setValue(itemData.visible);
				}
				if (itemData.mappedName !== undefined) {
					mappedNameEntry.setValue(itemData.mappedName);
				}
				if (itemData.defaultValue !== undefined) {
					defaultValueEntry.setValue(itemData.defaultValue);
				}
			}
		}
	}

	/**
	 * @param {function(import("../../../UI/PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewChangeEvent) : void} cb
	 */
	onValueChange(cb) {
		this.treeView.onChildValueChange(cb);
	}

	getModifiedValuesForSave() {
		const datas = {};

		let hasOneOrMoreMappedValues = false;
		for (const [name, mapUi] of this.createdMapListUis) {
			const data = {};
			let modified = false;
			if (!mapUi.visibleEntry.value) {
				data.visible = false;
				modified = true;
			}
			if (mapUi.mappedNameEntry.value) {
				data.mappedName = mapUi.mappedNameEntry.value;
				modified = true;
			}
			if (mapUi.defaultValueEntry.value) {
				data.defaultValue = mapUi.defaultValueEntry.getValue({getAsArray: true});
				modified = true;
			}
			if (modified) {
				datas[name] = data;
				hasOneOrMoreMappedValues = true;
			}
		}

		if (hasOneOrMoreMappedValues) {
			return datas;
		} else {
			return null;
		}
	}
}
