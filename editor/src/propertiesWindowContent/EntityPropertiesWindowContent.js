import {PropertiesWindowContent} from "./PropertiesWindowContent.js";
import {PropertiesTreeView} from "../ui/propertiesTreeView/PropertiesTreeView.js";
import {Button} from "../ui/Button.js";
import {DroppableGui} from "../ui/DroppableGui.js";
import {EntityEditorContentWindow} from "../windowManagement/contentWindows/EntityEditorContentWindow.js";
import {EntityProjectAssetType} from "../assets/projectAssetType/EntityProjectAssetType.js";
import {EntitySelection} from "../misc/EntitySelection.js";

export class EntityPropertiesWindowContent extends PropertiesWindowContent {
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
			for (const {entity} of this.currentSelection) {
				if (this.editingModeGui.value == "global") {
					entity.pos = newValue;
				} else if (this.editingModeGui.value == "instance") {
					throw new Error("Not implemented");
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
			for (const {entity} of this.currentSelection) {
				if (this.editingModeGui.value == "global") {
					entity.rot.setFromAxisAngle(newValue);
				} else if (this.editingModeGui.value == "instance") {
					throw new Error("Not implemented");
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
			for (const {entity} of this.currentSelection) {
				if (this.editingModeGui.value == "global") {
					entity.scale = newValue;
				} else if (this.editingModeGui.value == "instance") {
					throw new Error("Not implemented");
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
										usedAssetUuidsSymbol: EntityProjectAssetType.usedAssetUuidsSymbol,
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
	activeObjectsChanged(selectedObjects) {
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
			throw new Error("Not implemented");
		}
		this.isSettingTransformationValues = false;
	}

	/**
	 * @param {import("../misc/EntitySelection.js").EntitySelectionMetaData} metaData
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

		/** @type {import("../../../src/components/Component.js").Component[]} */
		const componentGroups = [];
		for (const {entity} of this.currentSelection) {
			for (const component of entity.components) {
				componentGroups.push(component);
			}
		}
		for (const componentGroup of componentGroups) {
			const componentConstructor = /** @type {typeof import("../../../src/components/Component.js").Component} */ (componentGroup.constructor);
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
				const castComponentGroup = /** @type {any} */ (componentGroup);
				componentUI.fillSerializableStructureValues(castComponentGroup, {
					beforeValueSetHook: ({value, setOnObject, setOnObjectKey}) => {
						if (value) {
							const castValue = /** @type {any} */ (value);
							if (this.editorInstance.projectAssetTypeManager.constructorHasAssetType(castValue.constructor)) {
								const usedAssetUuids = setOnObject[EntityProjectAssetType.usedAssetUuidsSymbol];
								if (usedAssetUuids) {
									const uuid = usedAssetUuids[setOnObjectKey];
									if (uuid) return uuid;
								}
							}
						}
						return value;
					},
				});
				componentUI.onChildValueChange(e => {
					const propertyName = componentUI.getSerializableStructureKeyForEntry(e.target);
					if (!propertyName) return;
					const scriptValueFromGui = e.target.getValue({purpose: "script"});
					this.mapFromDroppableGuiValues(componentGroup, propertyName, scriptValueFromGui, e.target);
					if (componentGroup.entity) {
						this.notifyEntityEditors(componentGroup.entity, "componentProperty");
					}
				});
			}
		}
	}

	/**
	 * @param {any} object
	 * @param {string | number} propertyName
	 * @param {any} scriptValue
	 * @param {import("../ui/propertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewEntry<any>} guiEntry
	 */
	mapFromDroppableGuiValues(object, propertyName, scriptValue, guiEntry) {
		if (Array.isArray(scriptValue)) {
			const castGuiEntry = /** @type {import("../ui/propertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewEntry<import("../ui/ArrayGui.js").ArrayGui<any>>} */ (guiEntry);
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
			if (!object[EntityProjectAssetType.usedAssetUuidsSymbol]) {
				object[EntityProjectAssetType.usedAssetUuidsSymbol] = {};
			}
			object[EntityProjectAssetType.usedAssetUuidsSymbol][propertyName] = guiEntry.value;
		}
	}

	/**
	 * @param {import("../../../src/mod.js").Entity} entity
	 * @param {import("../windowManagement/contentWindows/EntityEditorContentWindow.js").EntityChangedEventType} type
	 */
	notifyEntityEditors(entity, type) {
		for (const entityEditor of this.editorInstance.windowManager.getContentWindowsByConstructor(EntityEditorContentWindow)) {
			entityEditor.notifyEntityChanged(entity, type);
		}
	}
}
