import PropertiesWindowContent from "./PropertiesWindowContent.js";
import {Entity, defaultComponentTypeManager} from "../../../src/index.js";
import PropertiesTreeView from "../UI/PropertiesTreeView/PropertiesTreeView.js";
import Button from "../UI/Button.js";
import DroppableGui from "../UI/DroppableGui.js";
import editor from "../editorInstance.js";
import ContentWindowEntityEditor from "../WindowManagement/ContentWindows/ContentWindowEntityEditor.js";
import ProjectAssetTypeEntity from "../Assets/ProjectAssetType/ProjectAssetTypeEntity.js";

export default class PropertiesWindowEntityContent extends PropertiesWindowContent {
	constructor() {
		super();

		/** @type {Entity[]} */
		this.currentSelection = null;

		this.treeView = new PropertiesTreeView();
		this.el.appendChild(this.treeView.el);

		const entitySection = this.treeView.addCollapsable("Entity");
		this.positionProperty = entitySection.addItem({
			type: "vec3",
			guiOpts: {
				label: "Position",
			},
		});
		this.positionProperty.onValueChange(newValue => {
			for (const obj of this.currentSelection) {
				obj.pos = newValue;
				this.notifyEntityEditors(obj, "transform");
			}
		});

		this.rotationProperty = entitySection.addItem({
			type: "vec3",
			guiOpts: {
				label: "Rotation",
			},
		});
		this.rotationProperty.onValueChange(newValue => {
			for (const obj of this.currentSelection) {
				obj.rot.setFromAxisAngle(newValue);
				this.notifyEntityEditors(obj, "transform");
			}
		});

		this.scaleProperty = entitySection.addItem({
			type: "vec3",
			guiOpts: {
				label: "Scale",
			},
		});
		this.scaleProperty.onValueChange(newValue => {
			for (const obj of this.currentSelection) {
				obj.scale = newValue;
				this.notifyEntityEditors(obj, "transform");
			}
		});

		this.componentsSection = this.treeView.addCollapsable("Components");
		const createComponentButton = new Button({
			text: "+",
			onClick: () => {
				const menu = editor.contextMenuManager.createContextMenu();
				for (const component of defaultComponentTypeManager.getAllComponents()) {
					menu.addItem({
						text: component.name || component.uuid,
						onClick: async () => {
							for (const obj of this.currentSelection) {
								const componentInstance = obj.addComponent(component, {}, {
									editorOpts: {
										editorAssetTypeManager: editor.projectAssetTypeManager,
										usedAssetUuidsSymbol: ProjectAssetTypeEntity.usedAssetUuidsSymbol,
										assetManager: editor.projectManager.assetManager,
									},
								});
								await componentInstance.waitForEditorDefaults();
								this.notifyEntityEditors(obj, "component");
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
		return [Entity];
	}

	selectionChanged(selectedObjects) {
		this.currentSelection = selectedObjects;
		this.positionProperty.setValue(selectedObjects[0].pos);
		this.rotationProperty.setValue(selectedObjects[0].rot.toAxisAngle());
		this.scaleProperty.setValue(selectedObjects[0].scale);
		this.refreshComponents();
	}

	refreshComponents() {
		this.componentsSection.clearChildren();
		/** @type {import("../../../src/Components/Component.js").default[]} */
		const componentGroups = [];
		for (const entity of this.currentSelection) {
			for (const component of entity.components) {
				componentGroups.push(component);
			}
		}
		for (const componentGroup of componentGroups) {
			const componentData = componentGroup.getComponentData();
			const componentName = componentData?.name || componentData?.uuid || "<unknown>";
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
			const serializableStructure = componentData?.properties;
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
