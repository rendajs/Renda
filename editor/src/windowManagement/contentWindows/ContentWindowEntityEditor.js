import {ContentWindow} from "./ContentWindow.js";
import {ContentWindowOutliner} from "./ContentWindowOutliner.js";
import {ContentWindowBuildView} from "./ContentWindowBuildView.js";
import {Button} from "../../ui/Button.js";
import {CameraComponent, ClusteredLightsConfig, Entity, GizmoManager, OrbitControls, TranslationGizmo} from "../../../../src/mod.js";
import {ProjectAssetTypeEntity} from "../../assets/projectAssetType/ProjectAssetTypeEntity.js";

/** @typedef {"create" | "delete" | "transform" | "component" | "componentProperty"} EntityChangedEventType */

export class ContentWindowEntityEditor extends ContentWindow {
	static contentWindowTypeId = "entityEditor";
	static contentWindowUiName = "Entity Editor";
	static contentWindowUiIcon = "icons/contentWindowTabs/entityEditor.svg";

	/**
	 * @param {ConstructorParameters<typeof ContentWindow>} args
	 */
	constructor(...args) {
		super(...args);

		this.setContentBehindTopBar(true);

		const saveEntityButton = new Button({
			text: "Save",
			onClick: () => {
				this.saveEntityAsset();
			},
		});
		this.addTopBarEl(saveEntityButton.el);

		this.domTarget = this.editorInstance.renderer.createDomTarget();
		const renderTargetElement = this.domTarget.getElement();
		renderTargetElement.style.display = "block";
		this.contentEl.appendChild(renderTargetElement);

		this.renderDirty = false;
		this.onRenderDirtyCbs = new Set();

		this.editorScene = new Entity("editorScene");
		this.editorCamera = new Entity("editorCamera");
		this.editorScene.add(this.editorCamera);
		this.editorCamComponent = this.editorCamera.addComponent(CameraComponent);
		this.editorCamComponent.clusteredLightsConfig = new ClusteredLightsConfig();

		this.orbitControls = new OrbitControls(this.editorCamera, renderTargetElement);
		this.orbitControlsValuesDirty = false;
		this.lastOrbitControlsValuesChangeTime = 0;

		this.editingEntityUuid = null;
		/** @type {Entity?} */
		this._editingEntity = null;
		/** @type {import("../../misc/SelectionGroup.js").SelectionGroup<import("../../misc/EntitySelection.js").EntitySelection>} */
		this.selectionManager = this.editorInstance.selectionManager.createSelectionGroup();

		/** @type {Set<{projectAsset: import("../../assets/ProjectAsset.js").ProjectAssetAny, listener: () => void}>} */
		this.createdLiveAssetChangeListeners = new Set();

		this.gizmos = new GizmoManager(this.editorInstance.engineAssetManager);
		this.editorScene.add(this.gizmos.entity);
		this.gizmos.addPointerEventListeners(renderTargetElement, this.editorCamComponent);
		this.gizmos.onGizmoNeedsRender(() => {
			this.markRenderDirty(false);
		});

		this.translationGizmo = this.gizmos.addGizmo(TranslationGizmo);
		/** @type {Map<Entity, Map<import("../../../../src/mod.js").Component, import("../../componentGizmos/gizmos/ComponentGizmos.js").ComponentGizmosAny>>} */
		this.currentLinkedGizmos = new Map();

		this.persistentDataLoaded = false;
		this.ignoreNextPersistentDataOrbitChange = false;
		this.loadPersistentData();
	}

	async loadPersistentData() {
		const loadedEntityPath = await this.persistentData.get("loadedEntityPath");
		const assetManager = await this.editorInstance.projectManager.getAssetManager();
		const assetUuid = await assetManager.getAssetUuidFromPath(loadedEntityPath);
		if (assetUuid) {
			this.loadEntityAsset(assetUuid, true);

			this.orbitControls.lookPos = await this.persistentData.get("orbitLookPos");
			this.orbitControls.lookRot = await this.persistentData.get("orbitLookRot");
			const dist = await this.persistentData.get("orbitLookDist");
			if (dist != undefined) {
				this.orbitControls.lookDist = dist;
			}
			this.ignoreNextPersistentDataOrbitChange = true;
		}
		this.persistentDataLoaded = true;
	}

	destructor() {
		super.destructor();

		this.domTarget.destructor();
		this.editorScene.destructor();
		this._editingEntity = null;
		this.selectionManager.destructor();
		this.gizmos.destructor();
	}

	get editingEntity() {
		return this._editingEntity;
	}

	set editingEntity(val) {
		if (this._editingEntity) {
			this.editorScene.remove(this._editingEntity);
		}
		this._editingEntity = val;
		if (val) {
			this.editorScene.add(val);
		}
		this.updateGizmos();
		this.markRenderDirty();
		for (const outliner of this.editorInstance.windowManager.getContentWindowsByConstructor(ContentWindowOutliner)) {
			outliner.entityEditorUpdated({target: this});
		}
		this.updateBuildViews();
		this.updateLiveAssetChangeListeners();
	}

	/**
	 * @override
	 * @param {number} w
	 * @param {number} h
	 */
	onWindowResize(w, h) {
		this.domTarget.resize(w, h);

		this.editorCamComponent.aspect = w / h;
		this.markRenderDirty();
	}

	markRenderDirty(notifyExternalRenders = true) {
		this.renderDirty = true;
		if (notifyExternalRenders) {
			for (const cb of this.onRenderDirtyCbs) {
				cb();
			}
		}
	}

	/**
	 * @param {() => void} cb
	 */
	onRenderDirty(cb) {
		this.onRenderDirtyCbs.add(cb);
	}

	/**
	 * @param {() => void} cb
	 */
	removeOnRenderDirty(cb) {
		this.onRenderDirtyCbs.delete(cb);
	}

	newEmptyEditingEntity() {
		this.editingEntity = new Entity();
	}

	/**
	 * @param {import("../../../../src/util/mod.js").UuidString} entityUuid
	 * @param {boolean} fromContentWindowLoad
	 */
	async loadEntityAsset(entityUuid, fromContentWindowLoad = false) {
		const assetManager = await this.editorInstance.projectManager.getAssetManager();
		const projectAsset = await assetManager.getProjectAssetFromUuid(entityUuid, {
			assertAssetType: ProjectAssetTypeEntity,
		});
		if (!projectAsset) {
			this.newEmptyEditingEntity();
			return;
		}
		const entity = await projectAsset.getLiveAsset();
		this.editingEntityUuid = entityUuid;
		this.editingEntity = entity;
		if (!fromContentWindowLoad) {
			this.persistentData.set("loadedEntityPath", projectAsset.path);
		}
	}

	async saveEntityAsset() {
		if (!this.editingEntityUuid) return;
		const assetManager = await this.editorInstance.projectManager.getAssetManager();
		const asset = await assetManager.getProjectAssetFromUuid(this.editingEntityUuid);
		if (!asset) return;
		await asset.saveLiveAssetData();
	}

	loop() {
		if (this.orbitControls) {
			const camChanged = this.orbitControls.loop();
			if (camChanged) {
				this.markRenderDirty(false);
				if (this.persistentDataLoaded) {
					this.persistentData.set("orbitLookPos", this.orbitControls.lookPos.toArray(), false);
					this.persistentData.set("orbitLookRot", this.orbitControls.lookRot.toArray(), false);
					this.persistentData.set("orbitLookDist", this.orbitControls.lookDist, false);
				}
				this.orbitControlsValuesDirty = true;
				this.lastOrbitControlsValuesChangeTime = Date.now();
			}

			if (this.orbitControlsValuesDirty && Date.now() - this.lastOrbitControlsValuesChangeTime > 1000) {
				if (this.persistentDataLoaded) {
					if (!this.ignoreNextPersistentDataOrbitChange) {
						this.persistentData.flush();
					}
					this.ignoreNextPersistentDataOrbitChange = false;
				}
				this.orbitControlsValuesDirty = false;
			}
		}

		if (this.renderDirty && this.editorInstance.renderer.isInit) {
			this.render();
			this.renderDirty = false;
		}
	}

	render() {
		this.domTarget.render(this.editorCamComponent);
	}

	updateBuildViews() {
		for (const buildView of this.editorInstance.windowManager.getContentWindowsByConstructor(ContentWindowBuildView)) {
			buildView.setLinkedEntityEditor(this);
		}
	}

	updateGizmos() {
		const unusedEntities = new Map(this.currentLinkedGizmos);
		if (this.editingEntity) {
			for (const child of this.editingEntity.traverseDown()) {
				this.updateGizmosForEntity(child);
				unusedEntities.delete(child);
			}
		}

		for (const [entity, linkedComponentGizmos] of unusedEntities) {
			for (const componentGizmos of linkedComponentGizmos.values()) {
				componentGizmos.destructor();
			}
			this.currentLinkedGizmos.delete(entity);
		}
	}

	/**
	 * @param {Entity} entity
	 * @param {boolean} removeAll
	 */
	updateGizmosForEntity(entity, removeAll = false) {
		let linkedComponentGizmos = this.currentLinkedGizmos.get(entity);
		if (!linkedComponentGizmos) {
			linkedComponentGizmos = new Map();
		}

		// Gather unused ComponentGizmos, and create new ones
		const unusedComponentGizmos = new Map(linkedComponentGizmos);
		if (!removeAll) {
			for (const component of entity.components) {
				let componentGizmos = linkedComponentGizmos.get(component) ?? null;
				if (!componentGizmos) {
					const componentConstructor = /** @type {typeof import("../../../../src/mod.js").Component} */ (component.constructor);
					componentGizmos = this.editorInstance.componentGizmosManager.createComponentGizmosInstance(componentConstructor, component, this.gizmos);
					if (componentGizmos) {
						componentGizmos.entityMatrixChanged(entity.worldMatrix);
						linkedComponentGizmos.set(component, componentGizmos);
					}
				} else {
					unusedComponentGizmos.delete(component);
				}
				if (componentGizmos) {
					componentGizmos.componentPropertyChanged();
				}
			}
		}

		// Remove unused ComponentGizmos
		for (const [component, componentGizmos] of unusedComponentGizmos) {
			componentGizmos.destructor();
			linkedComponentGizmos.delete(component);
		}

		if (linkedComponentGizmos.size > 0) {
			this.currentLinkedGizmos.set(entity, linkedComponentGizmos);
		} else {
			this.currentLinkedGizmos.delete(entity);
		}
	}

	/**
	 * @param {Entity} entity
	 */
	updateGizmoPositionsForEntity(entity) {
		const linkedComponentGizmos = this.currentLinkedGizmos.get(entity);
		if (linkedComponentGizmos) {
			for (const componentGizmos of linkedComponentGizmos.values()) {
				componentGizmos.entityMatrixChanged(entity.worldMatrix);
			}
		}
	}

	updateLiveAssetChangeListeners() {
		for (const {projectAsset, listener} of this.createdLiveAssetChangeListeners) {
			projectAsset.removeOnLiveAssetNeedsReplacement(listener);
		}
		this.createdLiveAssetChangeListeners.clear();

		if (this.editingEntity) {
			for (const child of this.editingEntity.traverseDown()) {
				for (const component of child.components) {
					const componentConstructor = /** @type {typeof import("../../../../src/mod.js").Component} */ (component.constructor);
					if (componentConstructor.guiStructure) {
						const castComponentA = /** @type {unknown} */ (component);
						const castComponentB = /** @type {Object.<string, unknown>} */ (castComponentA);
						/** @type {import("../../ui/propertiesTreeView/types.js").PropertiesTreeViewEntryOptions} */
						const structure = {
							type: "object",
							guiOpts: {
								structure: componentConstructor.guiStructure,
							},
						};
						this.addComponentLiveAssetListeners(component, structure, castComponentB);
					}
				}
			}
		}
	}

	/**
	 * @param {import("../../../../src/mod.js").Component} rootComponent
	 * @param {import("../../ui/propertiesTreeView/types.js").PropertiesTreeViewEntryOptions} structure
	 * @param {Object.<string | number, unknown>} data
	 * @param {Object.<string | number, unknown>?} parentObject
	 * @param {string | number | null} propertyChangeName
	 */
	addComponentLiveAssetListeners(rootComponent, structure, data, parentObject = null, propertyChangeName = null) {
		if (structure.type == "object") {
			const guiOpts = structure.guiOpts;
			if (guiOpts) {
				const childStructure = guiOpts.structure;
				if (childStructure) {
					for (const [name, propertyStructure] of Object.entries(childStructure)) {
						const childData = data[name];
						if (childData && typeof childData == "object") {
							const castChildData = /** @type {Object.<string, unknown>} */ (childData);
							this.addComponentLiveAssetListeners(rootComponent, propertyStructure, castChildData, data, name);
						}
					}
				}
			}
		} else if (structure.type == "array" && Array.isArray(data)) {
			const arrayType = structure.guiOpts?.arrayType;
			if (arrayType) {
				/** @type {import("../../ui/propertiesTreeView/types.js").PropertiesTreeViewEntryOptionsGeneric<any>} */
				const arrayStructure = {
					type: arrayType,
					guiOpts: structure.guiOpts?.arrayGuiOpts,
				};
				for (const [i, item] of data.entries()) {
					this.addComponentLiveAssetListeners(rootComponent, arrayStructure, item, data, i);
				}
			}
		} else if (structure.type == "droppable") {
			if (data) {
				const assetManager = this.editorInstance.projectManager.assertAssetManagerExists();
				const projectAsset = assetManager.getProjectAssetForLiveAsset(data);
				if (projectAsset) {
					const listener = async () => {
						if (!propertyChangeName) return;
						parentObject[propertyChangeName] = await projectAsset.getLiveAsset();
						if (rootComponent.entity) {
							this.notifyEntityChanged(rootComponent.entity, "componentProperty");
						}
					};
					projectAsset.onLiveAssetNeedsReplacement(listener);
					this.createdLiveAssetChangeListeners.add({projectAsset, listener});
				}
			}
		}
	}

	/**
	 * @param {Entity} entity
	 * @param {EntityChangedEventType} type
	 */
	notifyEntityChanged(entity, type) {
		if (!this.editingEntity) return;
		if (!this.editingEntity.containsChild(entity) && type != "delete") return;

		this.markRenderDirty();

		if (type == "transform") {
			this.updateGizmoPositionsForEntity(entity);
		} else if (type == "component" || type == "componentProperty") {
			this.updateGizmosForEntity(entity);
		} else if (type == "delete") {
			this.updateGizmosForEntity(entity, true);
		}
	}

	notifyMaterialChanged() {
		this.markRenderDirty();
	}
}
