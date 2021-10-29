import PropertiesWindowContent from "./PropertiesWindowContent.js";
import {Entity, defaultComponentTypeManager} from "../../../src/index.js";
import PropertiesTreeView from "../UI/PropertiesTreeView/PropertiesTreeView.js";
import Button from "../UI/Button.js";
import DroppableGui from "../UI/DroppableGui.js";
import editor from "../editorInstance.js";
import ContentWindowEntityEditor from "../WindowManagement/ContentWindows/ContentWindowEntityEditor.js";
import ProjectAssetTypeEntity from "../Assets/ProjectAssetType/ProjectAssetTypeEntity.js";
import {EntitySelection} from "../Misc/EntitySelection.js";

export default class PropertiesWindowEntityContent extends PropertiesWindowContent {
	constructor() {
		super();

		/** @type {EntitySelection[]} */
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
			for (const {entity} of this.currentSelection) {
				if (this.editingModeGui.value == "global") {
					entity.pos = newValue;
				} else if (this.editingModeGui.value == "instance") {
					entity.setInstancePos(newValue);
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
			for (const {entity} of this.currentSelection) {
				if (this.editingModeGui.value == "global") {
					entity.rot.setFromAxisAngle(newValue);
				} else if (this.editingModeGui.value == "instance") {
					// entity.setInstanceRot(newValue);
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
			for (const {entity} of this.currentSelection) {
				if (this.editingModeGui.value == "global") {
					entity.scale = newValue;
				} else if (this.editingModeGui.value == "instance") {
					// entity.setInstanceScale(newValue);
				}
				this.notifyEntityEditors(entity, "transform");
			}
		});

		this.componentsSection = this.treeView.addCollapsable("Components");
		const createComponentButton = new Button({
			text: "+",
			onClick: () => {
				const menu = editor.contextMenuManager.createContextMenu();
				for (const component of defaultComponentTypeManager.getAllComponents()) {
					menu.addItem({
						text: component.componentName || component.uuid,
						onClick: async () => {
							for (const {entity} of this.currentSelection) {
								const componentInstance = entity.addComponent(component, {}, {
									editorOpts: {
										editorAssetTypeManager: editor.projectAssetTypeManager,
										usedAssetUuidsSymbol: ProjectAssetTypeEntity.usedAssetUuidsSymbol,
										assetManager: editor.projectManager.assetManager,
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

				menu.setPos(createComponentButton, "top left");
			},
		});
		this.componentsSection.addButton(createComponentButton);
	}

	destructor() {
		this.treeView.destructor();
		this.positionProperty = null;
		this.rotationProperty = null;
		this.scaleProperty = null;
		super.destructor();
	}

	static get useForTypes() {
		return [EntitySelection];
	}

	/**
	 * @param {EntitySelection[]} selectedObjects
	 */
	selectionChanged(selectedObjects) {
		this.currentSelection = selectedObjects;
		this.updateTransformationValues();
		this.refreshComponents();
	}

	updateTransformationValues() {
		this.isSettingTransformationValues = true;
		if (this.editingModeGui.value == "global") {
			const entity = this.currentSelection[0].entity;
			this.positionProperty.setValue(entity.pos);
			this.rotationProperty.setValue(entity.rot.toAxisAngle());
			this.scaleProperty.setValue(entity.scale);
		} else if (this.editingModeGui.value == "instance") {
			this.positionProperty.setValue([0, 0, 0]);
			this.rotationProperty.setValue([0, 0, 0]);
			this.scaleProperty.setValue([1, 1, 1]);
		}
		this.isSettingTransformationValues = false;
	}

	refreshComponents() {
		this.componentsSection.clearChildren();
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
							entity.removeComponent(componentGroup);
							this.notifyEntityEditors(entity, "component");
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
					const scriptValueFromGui = e.target.getValue({purpose: "script"});
					this.mapFromDroppableGuiValues(componentGroup, propertyName, scriptValueFromGui, e.target);
					this.notifyEntityEditors(componentGroup.entity, "componentProperty");
				});
				componentUI.fillSerializableStructureValues(componentGroup, {
					beforeValueSetHook: ({value, setOnObject, setOnObjectKey}) => {
						if (value && editor.projectAssetTypeManager.constructorHasAssetType(value.constructor)) {
							const usedAssetUuids = setOnObject[ProjectAssetTypeEntity.usedAssetUuidsSymbol];
							if (usedAssetUuids) {
								const uuid = usedAssetUuids[setOnObjectKey];
								if (uuid) return uuid;
							}
						}
						return value;
					},
				});
			}
		}
	}

	mapFromDroppableGuiValues(object, propertyName, scriptValue, guiEntry) {
		if (Array.isArray(scriptValue)) {
			const newScriptValue = [];
			for (const [i, item] of scriptValue.entries()) {
				this.mapFromDroppableGuiValues(newScriptValue, i, item, guiEntry.gui.valueItems[i]);
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
	 * @param {Entity} entity
	 * @param {import("../WindowManagement/ContentWindows/ContentWindowEntityEditor.js").EntityChangedEventType} type
	 */
	notifyEntityEditors(entity, type) {
		for (const entityEditor of editor.windowManager.getContentWindowsByConstructor(ContentWindowEntityEditor)) {
			entityEditor.notifyEntityChanged(entity, type);
		}
	}
}
