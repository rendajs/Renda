import {Texture} from "../../../../src/core/Texture.js";
import {Sampler} from "../../../../src/rendering/Sampler.js";
import {PropertiesTreeView} from "../../ui/propertiesTreeView/PropertiesTreeView.js";

/**
 * @typedef {object} MappableItem
 * @property {import("../../ui/propertiesTreeView/types.js").PropertiesTreeViewStructure} structure
 * @property {PropertiesTreeView} treeView
 */

/**
 * Responsible for rendering the list UI for mapped properties.
 * Each property contains a visibility checkbox, a textfield for the mapped name,
 * and a default value.
 */
export class MaterialMapListUi {
	/**
	 * @param {object} options
	 * @param {import("../../assets/materialMapTypeSerializers/MaterialMapTypeSerializer.js").MaterialMapTypeMappableValue[]} options.items
	 */
	constructor({
		items = [],
	}) {
		/** @type {Map<string, MappableItem>} */
		this.createdMapListUis = new Map();
		this.treeView = new PropertiesTreeView({name: "mapList"});
		for (const item of items) {
			const mappableItemTreeView = this.treeView.addCollapsable(item.name);
			/** @type {import("../../ui/propertiesTreeView/types.js").PropertiesTreeViewEntryOptions} */
			let defaultValueTypeOptions;
			if (item.type == "sampler") {
				defaultValueTypeOptions = {
					type: "droppable",
					guiOpts: {
						supportedAssetTypes: [Sampler],
					},
				};
			} else if (item.type == "texture2d") {
				defaultValueTypeOptions = {
					type: "droppable",
					guiOpts: {
						supportedAssetTypes: [Texture],
					},
				};
			} else {
				defaultValueTypeOptions = {
					type: item.type,
				};
			}
			/** @type {import("../../ui/propertiesTreeView/types.js").PropertiesTreeViewStructure} */
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
				defaultValue: defaultValueTypeOptions,
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
	 * @param {import("../../assets/MaterialMapTypeSerializerManager.js").MaterialMapMappedValuesAssetData} values
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
	 * @param {function(import("../../ui/propertiesTreeView/types.js").PropertiesTreeViewChangeEvent<any>) : void} cb
	 */
	onValueChange(cb) {
		this.treeView.onChildValueChange(cb);
	}

	getModifiedValuesForSave() {
		/** @type {import("../../assets/MaterialMapTypeSerializerManager.js").MaterialMapMappedValuesAssetData} */
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
