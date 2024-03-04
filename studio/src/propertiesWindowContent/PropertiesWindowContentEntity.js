import { PropertiesWindowContent } from "./PropertiesWindowContent.js";
import { PropertiesTreeView } from "../ui/propertiesTreeView/PropertiesTreeView.js";
import { Button } from "../ui/Button.js";
import { DroppableGui } from "../ui/DroppableGui.js";
import { ProjectAssetTypeEntity } from "../assets/projectAssetType/ProjectAssetTypeEntity.js";
import { EntitySelection } from "../misc/EntitySelection.js";
import { EntityChangeType } from "../assets/EntityAssetManager.js";

export class PropertiesWindowContentEntity extends PropertiesWindowContent {
	/** @type {import("../../../src/mod.js").Entity[]} */
	#currentTrackedEntityChangeEntities = [];

	#destructed = false;

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

		this.positionProperty = entitySection.addItem({
			type: "vec3",
			guiOpts: {
				label: "Position",
			},
		});
		this.positionProperty.onValueChange(changeEvent => {
			if (changeEvent.trigger != "user") return;
			if (!this.currentSelection) return;
			for (const { entity } of this.currentSelection) {
				if (this.editingModeGui.value == "global") {
					entity.pos = changeEvent.value;
				} else if (this.editingModeGui.value == "instance") {
					throw new Error("Not implemented");
				}
				this.studioInstance.projectManager.assetManager?.entityAssetManager.updateEntityTransform(entity, this);
			}
		});

		this.rotationProperty = entitySection.addItem({
			type: "vec3",
			guiOpts: {
				label: "Rotation",
			},
		});
		this.rotationProperty.onValueChange(changeEvent => {
			if (changeEvent.trigger != "user") return;
			if (!this.currentSelection) return;
			for (const { entity } of this.currentSelection) {
				if (this.editingModeGui.value == "global") {
					entity.rot.setFromAxisAngle(changeEvent.value);
				} else if (this.editingModeGui.value == "instance") {
					throw new Error("Not implemented");
				}
				this.studioInstance.projectManager.assetManager?.entityAssetManager.updateEntityTransform(entity, this);
			}
		});

		this.scaleProperty = entitySection.addItem({
			type: "vec3",
			guiOpts: {
				label: "Scale",
			},
		});
		this.scaleProperty.onValueChange(changeEvent => {
			if (changeEvent.trigger != "user") return;
			if (!this.currentSelection) return;
			for (const { entity } of this.currentSelection) {
				if (this.editingModeGui.value == "global") {
					entity.scale = changeEvent.value;
				} else if (this.editingModeGui.value == "instance") {
					throw new Error("Not implemented");
				}
				this.studioInstance.projectManager.assetManager?.entityAssetManager.updateEntityTransform(entity, this);
			}
		});

		this.componentsSection = this.treeView.addCollapsable("Components");
		this.componentsSection.renderContainer = true;
		const createComponentButton = new Button({
			text: "+",
			onClick: () => {
				const menu = this.studioInstance.popoverManager.createContextMenu();
				for (const component of this.studioInstance.componentTypeManager.getAllComponents()) {
					menu.addItem({
						text: component.componentName || component.uuid || "",
						onClick: async () => {
							if (!this.currentSelection) return;
							for (const { entity } of this.currentSelection) {
								const componentInstance = entity.addComponent(component, {}, {
									studioOpts: {
										studioAssetTypeManager: this.studioInstance.projectAssetTypeManager,
										usedAssetUuidsSymbol: ProjectAssetTypeEntity.usedAssetUuidsSymbol,
										assetManager: this.studioInstance.projectManager.assertAssetManagerExists(),
									},
								});
								await componentInstance.waitForStudioDefaults();
								this.studioInstance.projectManager.assetManager?.entityAssetManager.updateEntity(entity, EntityChangeType.CreateComponent, this);
							}
							this.refreshComponents();
							this.componentsSection.collapsed = false;
						},
					});
				}

				menu.setPos(createComponentButton);
			},
		});
		this.componentsSection.addButton(createComponentButton);
	}

	destructor() {
		this.treeView.destructor();
		this.#destructed = true;
		this.#updateTrackedEntityChangeCallbacks();
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
		this.#updateTrackedEntityChangeCallbacks();
	}

	#updateTrackedEntityChangeCallbacks() {
		const entityAssetManager = this.studioInstance.projectManager.assetManager?.entityAssetManager;
		if (!entityAssetManager) return;
		for (const oldEntity of this.#currentTrackedEntityChangeEntities) {
			entityAssetManager.removeOnTrackedEntityChange(oldEntity, this.#onTrackedEntityChange);
		}
		if (this.currentSelection && !this.#destructed) {
			for (const obj of this.currentSelection) {
				entityAssetManager.onTrackedEntityChange(obj.entity, this.#onTrackedEntityChange);
				this.#currentTrackedEntityChangeEntities.push(obj.entity);
			}
		}
	}

	/**
	 * @param {import("../assets/EntityAssetManager.js").OnTrackedEntityChangeEvent} e
	 */
	#onTrackedEntityChange = e => {
		if (e.source == this) return;
		if (e.type & EntityChangeType.Transform) {
			this.updateTransformationValues();
		}
	};

	updateTransformationValues() {
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
	}

	refreshComponents() {
		this.componentsSection.clearChildren();
		if (!this.currentSelection) return;

		/** @type {import("../../../src/components/Component.js").Component[]} */
		const componentGroups = [];
		for (const { entity } of this.currentSelection) {
			for (const component of entity.components) {
				componentGroups.push(component);
			}
		}
		for (const componentGroup of componentGroups) {
			const componentConstructor = /** @type {typeof import("../../../src/components/Component.js").Component} */ (componentGroup.constructor);
			const componentName = componentConstructor?.name || componentConstructor?.uuid || "<unknown>";
			const componentUI = this.componentsSection.addCollapsable(componentName);
			componentUI.renderContainer = true;
			componentUI.addEventListener("contextmenu", e => {
				e.showContextMenu([
					{
						text: "Remove",
						onClick: () => {
							const entity = componentGroup.entity;
							if (entity) {
								entity.removeComponent(componentGroup);
								this.studioInstance.projectManager.assetManager?.entityAssetManager.updateEntity(entity, EntityChangeType.DeleteComponent, this);
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
					beforeValueSetHook: ({ value, setOnObject, setOnObjectKey }) => {
						if (value) {
							const castValue = /** @type {any} */ (value);
							if (this.studioInstance.projectAssetTypeManager.constructorHasAssetType(castValue.constructor)) {
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
				componentUI.onChildValueChange(e => {
					const propertyName = componentUI.getSerializableStructureKeyForEntry(e.target);
					if (!propertyName) return;
					const scriptValueFromGui = e.target.getValue({ purpose: "script" });
					this.mapFromDroppableGuiValues(componentGroup, propertyName, scriptValueFromGui, e.target);
					if (componentGroup.entity) {
						this.studioInstance.projectManager.assetManager?.entityAssetManager.updateEntity(componentGroup.entity, EntityChangeType.ComponentProperty, this);
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
			if (!object[ProjectAssetTypeEntity.usedAssetUuidsSymbol]) {
				object[ProjectAssetTypeEntity.usedAssetUuidsSymbol] = {};
			}
			object[ProjectAssetTypeEntity.usedAssetUuidsSymbol][propertyName] = guiEntry.value;
		}
	}
}
