import PropertiesAssetContent from "./PropertiesAssetContent.js";
import editor from "../editorInstance.js";

export default class PropertiesAssetContentMaterialMap extends PropertiesAssetContent {
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

		this.addedMapTypes = new Map();
		this.mapTypesTreeView = this.treeView.addCollapsable("Map Types");

		this.addMapTypeButtonEntry = this.treeView.addItem({
			type: "button",
			/** @type {import("../UI/Button.js").ButtonGuiOptions} */
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

	hasTypeConstructor(typeConstructor) {
		return this.addedMapTypes.has(typeConstructor.typeUuid);
	}

	addMapTypeUuid(uuid, {
		updateMapListUi = true,
	} = {}) {
		const constructor = editor.materialMapTypeManager.getTypeByUuid(uuid);
		return this.addMapType(constructor, {updateMapListUi});
	}

	addMapType(TypeConstructor, {
		updateMapListUi = true,
	} = {}) {
		if (this.hasTypeConstructor(TypeConstructor)) {
			return this.addedMapTypes.get(TypeConstructor.typeUuid);
		}
		const treeView = this.mapTypesTreeView.addCollapsable(TypeConstructor.uiName);

		const typeInstance = new TypeConstructor(treeView);
		this.addedMapTypes.set(TypeConstructor.typeUuid, typeInstance);
		typeInstance.onValueChange(() => {
			if (!this.ignoreValueChange) {
				this.saveSelectedAssets();
			}
		});
		if (updateMapListUi) typeInstance.updateMapListUi();
		return typeInstance;
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
			const customData = await mapInstance.getCustomAssetDataForSaveInternal();
			if (customData) {
				map.customData = customData;
			}
			map.mappedValues = await mapInstance.getMappableValuesForSave();
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
