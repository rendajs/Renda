import {PropertiesAssetContent} from "../PropertiesAssetContent.js";
import {MaterialMapTypeEntry} from "./MaterialMapTypeEntry.js";

/**
 * Responsible for rendering the ui in the properties window for MaterialMaps.
 * @extends {PropertiesAssetContent<import("../../../assets/projectAssetType/MaterialMapProjectAssetType.js").MaterialMapProjectAssetType>}
 */
export class PropertiesAssetContentMaterialMap extends PropertiesAssetContent {
	/**
	 * @param {ConstructorParameters<typeof PropertiesAssetContent>} args
	 */
	constructor(...args) {
		super(...args);

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

		/** @type {Map<import("../../../../../src/util/mod.js").UuidString, MaterialMapTypeEntry>} */
		this.addedMapTypes = new Map();
		this.mapTypesTreeView = this.treeView.addCollapsable("Map Types");

		this.addMapTypeButtonEntry = this.treeView.addItem({
			type: "button",
			/** @type {import("../../../ui/Button.js").ButtonGuiOptions} */
			guiOpts: {
				text: "Add Map Type",
				onClick: () => {
					const menu = this.editorInstance.contextMenuManager.createContextMenu();
					for (const typeConstructor of this.editorInstance.materialMapTypeSerializerManager.getAllTypes()) {
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

					menu.setPos({item: this.addMapTypeButtonEntry.gui});
				},
			},
		});

		this.ignoreValueChange = false;
	}

	/**
	 * @override
	 * @param {import("../../../assets/ProjectAsset.js").ProjectAsset<import("../../../assets/projectAssetType/MaterialMapProjectAssetType.js").MaterialMapProjectAssetType>[]} selectedMaps
	 */
	async selectionUpdated(selectedMaps) {
		super.selectionUpdated(selectedMaps);
		// todo: handle multiple selected items or no selection
		const map = selectedMaps[0];
		const mapData = await map.readAssetData();
		this.ignoreValueChange = true;
		for (const entry of this.addedMapTypes.values()) {
			entry.selectedAssetsUpdated([...selectedMaps]);
		}
		await this.loadMaps(mapData);
		this.ignoreValueChange = false;
	}

	/**
	 * @param {typeof import("../../../assets/materialMapTypeSerializers/MaterialMapTypeSerializer.js").MaterialMapTypeSerializer} typeConstructor
	 */
	hasTypeConstructor(typeConstructor) {
		return this.addedMapTypes.has(typeConstructor.typeUuid);
	}

	/**
	 * Creates a map type entry by uuid if it doesn't already exist.
	 *
	 * @param {import("../../../../../src/util/mod.js").UuidString} uuid
	 * @param {Object} options
	 * @param {boolean} [options.updateMapListUi]
	 */
	addMapTypeUuid(uuid, {
		updateMapListUi = true,
	} = {}) {
		const constructor = this.editorInstance.materialMapTypeSerializerManager.getTypeByUuid(uuid);
		if (!constructor) throw new Error(`Material map type with uuid ${uuid} not found.`);
		return this.addMapType(constructor, {updateMapListUi});
	}

	/**
	 * Creates a new map type entry if it doesn't already exist.
	 *
	 * @param {typeof import("../../../assets/materialMapTypeSerializers/MaterialMapTypeSerializer.js").MaterialMapTypeSerializer} MaterialMapTypeConstructor
	 * @param {Object} options
	 * @param {boolean} [options.updateMapListUi]
	 */
	addMapType(MaterialMapTypeConstructor, {
		updateMapListUi = true,
	} = {}) {
		if (this.hasTypeConstructor(MaterialMapTypeConstructor)) {
			const typeConstructor = this.addedMapTypes.get(MaterialMapTypeConstructor.typeUuid);
			if (typeConstructor) return typeConstructor;
		}

		const entry = new MaterialMapTypeEntry(this.editorInstance, MaterialMapTypeConstructor);
		this.mapTypesTreeView.addChild(entry.treeView);

		this.addedMapTypes.set(MaterialMapTypeConstructor.typeUuid, entry);
		entry.selectedAssetsUpdated([...this.currentSelection]);
		entry.onValueChange(() => {
			if (!this.ignoreValueChange) {
				this.saveSelectedAssets();
			}
		});
		if (updateMapListUi) entry.updateMapListUi();
		return entry;
	}

	/**
	 * @param {import("../../../assets/MaterialMapTypeSerializerManager.js").MaterialMapAssetData} mapData
	 */
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
		/** @type {import("../../../assets/MaterialMapTypeSerializerManager.js").MaterialMapTypeAssetData[]} */
		const maps = [];
		for (const [uuid, mapInstance] of this.addedMapTypes) {
			/** @type {import("../../../assets/MaterialMapTypeSerializerManager.js").MaterialMapTypeAssetData} */
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
			maps.push(map);
		}

		/** @type {import("../../../assets/MaterialMapTypeSerializerManager.js").MaterialMapAssetData} */
		const data = {maps};
		return data;
	}

	async saveSelectedAssets() {
		const assetData = await this.getAssetData();
		const selectedAssets = this.currentSelection;
		for (const asset of selectedAssets) {
			(async () => {
				await asset.writeAssetData(assetData);
				asset.liveAssetNeedsReplacement();
			})();
		}
	}
}
