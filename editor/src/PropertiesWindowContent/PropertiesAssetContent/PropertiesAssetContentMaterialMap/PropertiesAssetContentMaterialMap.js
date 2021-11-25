import {PropertiesAssetContent} from "../PropertiesAssetContent.js";
import editor from "../../../editorInstance.js";
import {MaterialMapTypeEntry} from "./MaterialMapTypeEntry.js";

/**
 * Responsible for rendering the ui in the properties window for MaterialMaps.
 */
export class PropertiesAssetContentMaterialMap extends PropertiesAssetContent {
	constructor() {
		super();

		const mappedNameStruct = {
			from: {
				type: String,
			},
			to: {
				type: String,
			},
		};

		const mapStruct = {
			mapTypeId: {
				type: String,
			},
			mappedNames: {
				type: Array,
				arrayOpts: {
					type: mappedNameStruct,
				},
			},
		};

		this.mapStructure = {
			maps: {
				type: Array,
				arrayOpts: {
					type: mapStruct,
				},
			},
		};

		/** @type {Map<import("../../../Util/Util.js").UuidString, MaterialMapTypeEntry>} */
		this.addedMapTypes = new Map();
		this.mapTypesTreeView = this.treeView.addCollapsable("Map Types");

		this.addMapTypeButtonEntry = this.treeView.addItem({
			type: "button",
			/** @type {import("../../../UI/Button.js").ButtonGuiOptions} */
			guiOpts: {
				text: "Add Map Type",
				onClick: () => {
					const menu = editor.contextMenuManager.createContextMenu();
					for (const typeConstructor of editor.materialMapTypeManager.getAllTypes()) {
						const disabled = this.hasTypeConstructor(typeConstructor);
						menu.addItem({
							text: typeConstructor.uiName,
							onClick: () => {
								this.addMapType(typeConstructor);
								this.saveSelectedAssets();
							},
							disabled,
						});
					}

					menu.setPos(this.addMapTypeButtonEntry.gui, "top left");
				},
			},
		});

		this.ignoreValueChange = false;
	}

	async selectionUpdated(selectedMaps) {
		super.selectionUpdated(selectedMaps);
		// todo: handle multiple selected items or no selection
		const map = selectedMaps[0];
		const mapData = await map.readAssetData();
		this.ignoreValueChange = true;
		await this.loadMaps(mapData);
		this.ignoreValueChange = false;
	}

	/**
	 * @param {typeof import("./MaterialMapTypes/MaterialMapTypeSerializer.js").MaterialMapTypeSerializer} typeConstructor
	 */
	hasTypeConstructor(typeConstructor) {
		return this.addedMapTypes.has(typeConstructor.typeUuid);
	}

	/**
	 * @param {import("../../../Util/Util.js").UuidString} uuid
	 * @param {Object} options
	 * @param {boolean} [options.updateMapListUi]
	 */
	addMapTypeUuid(uuid, {
		updateMapListUi = true,
	} = {}) {
		const constructor = editor.materialMapTypeManager.getTypeByUuid(uuid);
		return this.addMapType(constructor, {updateMapListUi});
	}

	/**
	 * @param {typeof import("./MaterialMapTypes/MaterialMapTypeSerializer.js").MaterialMapTypeSerializer} MaterialMapTypeConstructor
	 * @param {Object} options
	 * @param {boolean} [options.updateMapListUi]
	 */
	addMapType(MaterialMapTypeConstructor, {
		updateMapListUi = true,
	} = {}) {
		if (this.hasTypeConstructor(MaterialMapTypeConstructor)) {
			return this.addedMapTypes.get(MaterialMapTypeConstructor.typeUuid);
		}

		const entry = new MaterialMapTypeEntry(MaterialMapTypeConstructor);
		this.mapTypesTreeView.addChild(entry.treeView);

		this.addedMapTypes.set(MaterialMapTypeConstructor.typeUuid, entry);
		entry.onValueChange(() => {
			if (!this.ignoreValueChange) {
				this.saveSelectedAssets();
			}
		});
		if (updateMapListUi) entry.updateMapListUi();
		return entry;
	}

	async loadMaps(mapData) {
		const maps = mapData?.maps || [];
		for (const map of maps) {
			const typeInstance = this.addMapTypeUuid(map.mapTypeId, {updateMapListUi: false});
			if (map.customData) await typeInstance.customAssetDataFromLoad(map.customData);
			await typeInstance.updateMapListUi();
			if (map.mappedValues) await typeInstance.fillMapListValues(map.mappedValues);
		}
	}

	async getAssetData() {
		const data = {
			maps: [],
		};
		for (const [uuid, mapInstance] of this.addedMapTypes) {
			const map = {
				mapTypeId: uuid,
			};
			const customData = await mapInstance.getCustomAssetDataForSave();
			if (customData) {
				map.customData = customData;
			}
			const mappedValues = await mapInstance.getMappedValuesForSave();
			if (mappedValues) {
				map.mappedValues = mappedValues;
			}
			data.maps.push(map);
		}
		return data;
	}

	async saveSelectedAssets() {
		const assetData = await this.getAssetData();
		for (const asset of this.currentSelection) {
			asset.writeAssetData(assetData);
		}
	}
}
