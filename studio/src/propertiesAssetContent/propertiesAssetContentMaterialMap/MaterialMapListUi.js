import {Texture} from "../../../../src/core/Texture.js";
import {Sampler} from "../../../../src/rendering/Sampler.js";
import {PropertiesTreeView} from "../../ui/propertiesTreeView/PropertiesTreeView.js";

/**
 * @typedef {object} MappableItem
 * @property {import("../../../../src/rendering/MaterialMap.js").MappableMaterialTypesEnum} type
 * @property {import("../../ui/propertiesTreeView/types.ts").PropertiesTreeViewStructure} structure
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
		this.treeView = new PropertiesTreeView();
		for (const item of items) {
			const mappableItemTreeView = this.treeView.addCollapsable(item.name);
			mappableItemTreeView.renderContainer = true;
			/** @type {import("../../ui/propertiesTreeView/types.ts").PropertiesTreeViewStructure?} */
			let defaultValueTypeOptions = null;
			if (item.type == "sampler") {
				defaultValueTypeOptions = {
					defaultValue: {
						type: "droppable",
						guiOpts: {
							supportedAssetTypes: [Sampler],
						},
					},
				};
			} else if (item.type == "texture2d") {
				defaultValueTypeOptions = {
					defaultTexture: {
						type: "droppable",
						guiOpts: {
							supportedAssetTypes: [Texture],
						},
					},
					defaultColor: {
						type: "vec4",
					},
				};
			} else if (item.type == "custom") {
				// Custom properties don't have any ui for a default value
			} else if (item.type == "enum") {
				let defaultValue = "";
				if (typeof item.defaultValue == "string") {
					defaultValue = item.defaultValue;
				}
				defaultValueTypeOptions = {
					defaultValue: {
						type: "dropdown",
						guiOpts: {
							items: item.enumOptions,
							defaultValue,
						}
					}
				}
			} else {
				defaultValueTypeOptions = {
					defaultValue: {
						type: item.type,
					},
				};
			}
			/** @type {import("../../ui/propertiesTreeView/types.ts").PropertiesTreeViewStructure} */
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
				...defaultValueTypeOptions,
			};
			mappableItemTreeView.generateFromSerializableStructure(structure);

			this.createdMapListUis.set(item.name, {
				type: item.type,
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
				/** @type {any} */
				const guiData = {...itemData};
				if (mapUi.type == "texture2d") {
					const defaultValue = guiData.defaultValue;
					if (typeof defaultValue == "string") {
						guiData.defaultTexture = defaultValue;
					} else if (Array.isArray(defaultValue)) {
						guiData.defaultColor = defaultValue;
					}
					delete guiData.defaultValue;
				}
				mapUi.treeView.fillSerializableStructureValues(guiData);
			}
		}
	}

	/**
	 * @param {(event: import("../../ui/propertiesTreeView/types.ts").PropertiesTreeViewChangeEvent<any>) => void} cb
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
				if (mapUi.type == "texture2d") {
					const defaultValue = values.defaultTexture || values.defaultColor;
					if (defaultValue) values.defaultValue = defaultValue;
					delete values.defaultTexture;
					delete values.defaultColor;
				}
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
