import {PropertiesTreeView} from "../../../UI/PropertiesTreeView/PropertiesTreeView.js";

/**
 * @typedef {Object} MappableItem
 * @property {import("../../../UI/PropertiesTreeView/types.js").PropertiesTreeViewStructure} structure
 * @property {PropertiesTreeView} treeView
 */

/**
 * Responsible for rendering the list UI for mapped properties.
 * Each property contains a visibility checkbox, a textfield for the mapped name,
 * and a default value.
 */
export class MaterialMapListUi {
	/**
	 * @param {Object} options
	 * @param {import("../../../assets/projectAssetType/projectAssetTypeMaterialMap/materialMapTypes/MaterialMapTypeSerializer.js").MaterialMapTypeMappableValue[]} options.items
	 */
	constructor({
		items = [],
	}) {
		/** @type {Map<string, MappableItem>} */
		this.createdMapListUis = new Map();
		this.treeView = new PropertiesTreeView({name: "mapList"});
		for (const item of items) {
			const mappableItemTreeView = this.treeView.addCollapsable(item.name);
			/** @type {import("../../../UI/PropertiesTreeView/types.js").PropertiesTreeViewStructure} */
			const structure = {
				visible: {
					type: "boolean",
					guiOpts: {
						defaultValue: true,
					},
				},
				mappedName: {
					type: "string",
					guiOpts: {
						defaultValue: item.name,
					},
				},
				defaultValue: {
					type: item.type,
				},
			};
			mappableItemTreeView.generateFromSerializableStructure(structure);

			this.createdMapListUis.set(item.name, {
				structure,
				treeView: mappableItemTreeView,
			});
		}
	}

	destructor() {
		if (this.treeView.parent) this.treeView.parent.removeChild(this.treeView);
	}

	/**
	 * @param {import("../../../assets/projectAssetType/projectAssetTypeMaterialMap/MaterialMapTypeSerializerManager.js").MaterialMapMappedValuesAssetData} values
	 */
	setValues(values) {
		for (const [name, itemData] of Object.entries(values)) {
			const mapUi = this.createdMapListUis.get(name);
			if (mapUi) {
				mapUi.treeView.fillSerializableStructureValues(itemData);
			}
		}
	}

	/**
	 * @param {function(import("../../../UI/PropertiesTreeView/types.js").PropertiesTreeViewChangeEvent<any>) : void} cb
	 */
	onValueChange(cb) {
		this.treeView.onChildValueChange(cb);
	}

	getModifiedValuesForSave() {
		/** @type {import("../../../assets/projectAssetType/projectAssetTypeMaterialMap/MaterialMapTypeSerializerManager.js").MaterialMapMappedValuesAssetData} */
		const datas = {};

		let hasOneOrMoreMappedValues = false;
		for (const [name, mapUi] of this.createdMapListUis) {
			const values = mapUi.treeView.getSerializableStructureValues(mapUi.structure, {purpose: "fileStorage"});
			if (values) {
				datas[name] = values;
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
