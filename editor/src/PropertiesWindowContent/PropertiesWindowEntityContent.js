import {PropertiesWindowContent} from "./PropertiesWindowContent.js";
import {Quat} from "../../../src/mod.js";
import {PropertiesTreeView} from "../UI/PropertiesTreeView/PropertiesTreeView.js";
import {Button} from "../UI/Button.js";
import {DroppableGui} from "../UI/DroppableGui.js";
import {ContentWindowEntityEditor} from "../windowManagement/contentWindows/ContentWindowEntityEditor.js";
import {ProjectAssetTypeEntity} from "../assets/ProjectAssetType/ProjectAssetTypeEntity.js";
import {EntitySelection} from "../Misc/EntitySelection.js";

export class PropertiesWindowEntityContent extends PropertiesWindowContent {
	/**
	 * @param {ConstructorParameters<typeof PropertiesWindowContent>} args
	 */
	constructor(...args) {
		super(...args);

		/** @type {EntitySelection[]?} */
		this.currentSelection = null;

		this.treeView = new PropertiesTreeView();
		this.el.appendChild(this.treeView.el);

		const entitySection = this.treeView.addCollapsable("Entity");

		this.editingModeGui = entitySection.addItem({
			type: "buttonSelector",
			guiOpts: {
				label: "Editing mode",
				items: ["global", "instance"],
			},
		});
		this.editingModeGui.onValueChange(() => {
			this.updateTransformationValues();
		});

		this.isSettingTransformationValues = false;
		this.positionProperty = entitySection.addItem({
			type: "vec3",
			guiOpts: {
				label: "Position",
			},
		});
		this.positionProperty.onValueChange(newValue => {
			if (this.isSettingTransformationValues) return;
			if (!this.currentSelection) return;
			for (const {entity, metaData} of this.currentSelection) {
				if (this.editingModeGui.value == "global") {
					entity.pos = newValue;
				} else if (this.editingModeGui.value == "instance") {
					const {parent, index} = this.getParentDataFromEntitySelectionMetaData(metaData);
					entity.setInstancePos(newValue, parent, index);
				}
				this.notifyEntityEditors(entity, "transform");
			}
		});

		this.rotationProperty = entitySection.addItem({
			type: "vec3",
			guiOpts: {
				label: "Rotation",
			},
		});
		this.rotationProperty.onValueChange(newValue => {
			if (this.isSettingTransformationValues) return;
			if (!this.currentSelection) return;
			for (const {entity, metaData} of this.currentSelection) {
				if (this.editingModeGui.value == "global") {
					entity.rot.setFromAxisAngle(newValue);
				} else if (this.editingModeGui.value == "instance") {
					const {parent, index} = this.getParentDataFromEntitySelectionMetaData(metaData);
					const quat = Quat.fromAxisAngle(newValue);
					entity.setInstanceRot(quat, parent, index);
				}
				this.notifyEntityEditors(entity, "transform");
			}
		});

		this.scaleProperty = entitySection.addItem({
			type: "vec3",
			guiOpts: {
				label: "Scale",
			},
		});
		this.scaleProperty.onValueChange(newValue => {
			if (this.isSettingTransformationValues) return;
			if (!this.currentSelection) return;
			for (const {entity, metaData} of this.currentSelection) {
				if (this.editingModeGui.value == "global") {
					entity.scale = newValue;
				} else if (this.editingModeGui.value == "instance") {
					const {parent, index} = this.getParentDataFromEntitySelectionMetaData(metaData);
					entity.setInstanceScale(newValue, parent, index);
				}
				this.notifyEntityEditors(entity, "transform");
			}
		});

		this.componentsSection = this.treeView.addCollapsable("Components");
		const createComponentButton = new Button({
			text: "+",
			onClick: () => {
				const menu = this.editorInstance.contextMenuManager.createContextMenu();
				for (const component of this.editorInstance.componentTypeManager.getAllComponents()) {
					menu.addItem({
						text: component.componentName || component.uuid || "",
						onClick: async () => {
							if (!this.currentSelection) return;
							for (const {entity} of this.currentSelection) {
								const componentInstance = entity.addComponent(component, {}, {
									editorOpts: {
										editorAssetTypeManager: this.editorInstance.projectAssetTypeManager,
										usedAssetUuidsSymbol: ProjectAssetTypeEntity.usedAssetUuidsSymbol,
										assetManager: this.editorInstance.projectManager.assertAssetManagerExists(),
									},
								});
								await componentInstance.waitForEditorDefaults();
								this.notifyEntityEditors(entity, "component");
							}
							this.refreshComponents();
							this.componentsSection.collapsed = false;
						},
					});
				}

				menu.setPos({item: createComponentButton});
			},
		});
		this.componentsSection.addButton(createComponentButton);
	}

	destructor() {
		this.treeView.destructor();
		super.destructor();
	}

	static get useForTypes() {
		return [EntitySelection];
	}

	/**
	 * @override
	 * @param {EntitySelection[]} selectedObjects
	 */
	selectionChanged(selectedObjects) {
		this.currentSelection = selectedObjects;
		this.updateTransformationValues();
		this.refreshComponents();
	}

	updateTransformationValues() {
		this.isSettingTransformationValues = true;
		if (!this.currentSelection) return;

		// todo: support multiple selections
		if (this.editingModeGui.value == "global") {
			const entity = this.currentSelection[0].entity;
			this.positionProperty.setValue(entity.pos);
			this.rotationProperty.setValue(entity.rot.toAxisAngle());
			this.scaleProperty.setValue(entity.scale);
		} else if (this.editingModeGui.value == "instance") {
			const firstEntitySelection = this.currentSelection[0];
			const {parent, index} = this.getParentDataFromEntitySelectionMetaData(firstEntitySelection.metaData);

			const pos = firstEntitySelection.entity.getInstancePos(parent, index);
			if (pos) {
				this.positionProperty.setValue(pos);
			} else {
				this.positionProperty.setValue([0, 0, 0]);
			}

			const rot = firstEntitySelection.entity.getInstanceRot(parent, index);
			if (rot) {
				this.rotationProperty.setValue(rot.toAxisAngle());
			} else {
				this.rotationProperty.setValue([0, 0, 0]);
			}

			const scale = firstEntitySelection.entity.getInstanceScale(parent, index);
			if (scale) {
				this.scaleProperty.setValue(scale);
			} else {
				this.scaleProperty.setValue([1, 1, 1]);
			}
		}
		this.isSettingTransformationValues = false;
	}

	/**
	 * @param {import("../Misc/EntitySelection.js").EntitySelectionMetaData} metaData
	 */
	getParentDataFromEntitySelectionMetaData(metaData) {
		const parentTreeView = metaData.outlinerTreeView.parent;
		if (!parentTreeView) throw new Error("Failed to get parent data: TreeView has no parent.");
		const parent = metaData.outliner.getEntityByTreeViewItem(parentTreeView);
		const index = metaData.outlinerTreeView.index;
		return {parent, index};
	}

	refreshComponents() {
		this.componentsSection.clearChildren();
		if (!this.currentSelection) return;

		/** @type {import("../../../src/Components/Component.js").Component[]} */
		const componentGroups = [];
		for (const {entity} of this.currentSelection) {
			for (const component of entity.components) {
				componentGroups.push(component);
			}
		}
		for (const componentGroup of componentGroups) {
			const componentConstructor = /** @type {typeof import("../../../src/Components/Component.js").Component} */ (componentGroup.constructor);
			const componentName = componentConstructor?.name || componentConstructor?.uuid || "<unknown>";
			const componentUI = this.componentsSection.addCollapsable(componentName);
			componentUI.addEventListener("contextmenu", e => {
				e.showContextMenu([
					{
						text: "Remove",
						onClick: () => {
							const entity = componentGroup.entity;
							if (entity) {
								entity.removeComponent(componentGroup);
								this.notifyEntityEditors(entity, "component");
							}
							this.refreshComponents();
						},
					},
				]);
			});
			const serializableStructure = componentConstructor?.guiStructure;
			if (serializableStructure) {
				componentUI.generateFromSerializableStructure(serializableStructure);
				componentUI.onChildValueChange(e => {
					const propertyName = componentUI.getSerializableStructureKeyForEntry(e.target);
					if (!propertyName) return;
					const scriptValueFromGui = e.target.getValue({purpose: "script"});
					this.mapFromDroppableGuiValues(componentGroup, propertyName, scriptValueFromGui, e.target);
					if (componentGroup.entity) {
						this.notifyEntityEditors(componentGroup.entity, "componentProperty");
					}
				});
				const castComponentGroup = /** @type {any} */ (componentGroup);
				componentUI.fillSerializableStructureValues(castComponentGroup, {
					beforeValueSetHook: ({value, setOnObject, setOnObjectKey}) => {
						if (value) {
							const castValue = /** @type {any} */ (value);
							if (this.editorInstance.projectAssetTypeManager.constructorHasAssetType(castValue.constructor)) {
								const usedAssetUuids = setOnObject[ProjectAssetTypeEntity.usedAssetUuidsSymbol];
								if (usedAssetUuids) {
									const uuid = usedAssetUuids[setOnObjectKey];
									if (uuid) return uuid;
								}
							}
						}
						return value;
					},
				});
			}
		}
	}

	/**
	 * @param {any} object
	 * @param {string | number} propertyName
	 * @param {any} scriptValue
	 * @param {import("../UI/PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewEntry<any>} guiEntry
	 */
	mapFromDroppableGuiValues(object, propertyName, scriptValue, guiEntry) {
		if (Array.isArray(scriptValue)) {
			const castGuiEntry = /** @type {import("../UI/PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewEntry<import("../UI/ArrayGui.js").ArrayGui<any>>} */ (guiEntry);
			/** @type {unknown[]} */
			const newScriptValue = [];
			for (const [i, item] of scriptValue.entries()) {
				this.mapFromDroppableGuiValues(newScriptValue, i, item, castGuiEntry.gui.valueItems[i]);
			}
			scriptValue = newScriptValue;
		}
		// todo: make it work with objects as well

		object[propertyName] = scriptValue;
		if (guiEntry.gui instanceof DroppableGui) {
			if (!object[ProjectAssetTypeEntity.usedAssetUuidsSymbol]) {
				object[ProjectAssetTypeEntity.usedAssetUuidsSymbol] = {};
			}
			object[ProjectAssetTypeEntity.usedAssetUuidsSymbol][propertyName] = guiEntry.value;
		}
	}

	/**
	 * @param {import("../../../src/mod.js").Entity} entity
	 * @param {import("../windowManagement/contentWindows/ContentWindowEntityEditor.js").EntityChangedEventType} type
	 */
	notifyEntityEditors(entity, type) {
		for (const entityEditor of this.editorInstance.windowManager.getContentWindowsByConstructor(ContentWindowEntityEditor)) {
			entityEditor.notifyEntityChanged(entity, type);
		}
	}
}
