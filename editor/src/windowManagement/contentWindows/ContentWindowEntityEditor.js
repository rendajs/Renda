import {ContentWindow} from "./ContentWindow.js";
import {ContentWindowOutliner} from "./ContentWindowOutliner.js";
import {ContentWindowBuildView} from "./ContentWindowBuildView.js";
import {Button} from "../../UI/Button.js";
import {CameraComponent, ClusteredLightsConfig, Component, Entity, GizmoManager, OrbitControls, TranslationGizmo} from "../../../../src/mod.js";
import {SelectionGroup} from "../../Misc/SelectionGroup.js";
import {ComponentGizmos} from "../../componentGizmos/gizmos/ComponentGizmos.js";

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
		/** @type {Entity} */
		this._editingEntity = null;
		/** @type {SelectionGroup<import("../../Misc/EntitySelection.js").EntitySelection>} */
		this.selectionManager = this.editorInstance.selectionManager.createSelectionGroup();

		this.createdLiveAssetChangeListeners = new Set();

		this.gizmos = new GizmoManager(this.editorInstance.engineAssetManager);
		this.editorScene.add(this.gizmos.entity);
		this.translationGizmo = this.gizmos.addGizmo(TranslationGizmo);
		/** @type {Map<Entity, Map<Component, ComponentGizmos>>} */
		this.currentLinkedGizmos = new Map(); // Map<Entity, Set<Gizmo>>

		this.persistentDataLoaded = false;
		this.ignoreNextPersistentDataOrbitChange = false;
		this.loadPersistentData();
	}

	async loadPersistentData() {
		const loadedEntityPath = await this.persistentData.get("loadedEntityPath");
		const assetUuid = await this.editorInstance.projectManager.assetManager.getAssetUuidFromPath(loadedEntityPath);
		this.loadEntityAsset(assetUuid, true);

		this.orbitControls.lookPos = await this.persistentData.get("orbitLookPos");
		this.orbitControls.lookRot = await this.persistentData.get("orbitLookRot");
		const dist = await this.persistentData.get("orbitLookDist");
		if (dist != undefined) {
			this.orbitControls.lookDist = dist;
		}
		this.ignoreNextPersistentDataOrbitChange = true;
		this.persistentDataLoaded = true;
	}

	destructor() {
		super.destructor();

		this.domTarget.destructor();
		this.editorScene.destructor();
		this._editingEntity = null;
		this.selectionManager.destructor();
		this.selectionManager = null;
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
		this.editorScene.add(val);
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

	onRenderDirty(cb) {
		this.onRenderDirtyCbs.add(cb);
	}

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
		/** @type {import("../../assets/ProjectAsset.js").ProjectAsset<import("../../assets/ProjectAssetType/ProjectAssetTypeEntity.js").ProjectAssetTypeEntity>} */
		const projectAsset = await this.editorInstance.projectManager.assetManager.getProjectAsset(entityUuid);
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
		const asset = await this.editorInstance.projectManager.assetManager.getProjectAsset(this.editingEntityUuid);
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
		for (const {child} of this.editingEntity.traverseDown()) {
			this.updateGizmosForEntity(child);
			unusedEntities.delete(child);
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
				let componentGizmos = linkedComponentGizmos.get(component);
				if (!componentGizmos) {
					const componentConstructor = /** @type {typeof Component} */ (component.constructor);
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
			projectAsset.removeOnNewLiveAssetInstance(listener);
		}
		this.createdLiveAssetChangeListeners.clear();

		for (const {child} of this.editingEntity.traverseDown()) {
			for (const component of child.components) {
				const componentConstructor = /** @type {typeof Component} */ (component.constructor);
				this.addComponentLiveAssetListeners(component, componentConstructor.guiStructure, component, true);
			}
		}
	}

	addComponentLiveAssetListeners(rootComponent, structure, data, isRoot = false, parentObject = null, propertyChangeName = null) {
		if (isRoot || structure.type == Object) {
			for (const [name, propertyData] of Object.entries(structure)) {
				this.addComponentLiveAssetListeners(rootComponent, propertyData, data[name], false, data, name);
			}
		} else if (structure.type == Array) {
			for (const [i, item] of data.entries()) {
				this.addComponentLiveAssetListeners(rootComponent, structure.arrayOpts, item, false, data, i);
			}
		} else if (this.editorInstance.projectAssetTypeManager.constructorHasAssetType(structure.type)) {
			if (data) {
				const projectAsset = this.editorInstance.projectManager.assetManager.getProjectAssetForLiveAsset(data);
				const listener = async () => {
					parentObject[propertyChangeName] = await projectAsset.getLiveAsset();
					this.notifyEntityChanged(rootComponent.entity, "componentProperty");
				};
				projectAsset.onNewLiveAssetInstance(listener);
				this.createdLiveAssetChangeListeners.add({projectAsset, listener});
			}
		}
	}

	/**
	 * @param {Entity} entity
	 * @param {EntityChangedEventType} type
	 */
	notifyEntityChanged(entity, type) {
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
