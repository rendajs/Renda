import {ContentWindow} from "./ContentWindow.js";
import {ContentWindowOutliner} from "./ContentWindowOutliner.js";
import {ContentWindowBuildView} from "./ContentWindowBuildView.js";
import {Button} from "../../ui/Button.js";
import {CameraComponent, ClusteredLightsConfig, Entity, GizmoManager, Mat4, OrbitControls, Quat, TranslationGizmo, Vec3} from "../../../../src/mod.js";
import {ProjectAssetTypeEntity} from "../../assets/projectAssetType/ProjectAssetTypeEntity.js";
import {ProjectAssetTypeGltf} from "../../assets/projectAssetType/ProjectAssetTypeGltf.js";
import {RotationGizmo} from "../../../../src/gizmos/gizmos/RotationGizmo.js";
import {ButtonGroup} from "../../ui/ButtonGroup.js";
import {getEditorInstance} from "../../editorInstance.js";

/** @typedef {"create" | "delete" | "transform" | "component" | "componentProperty"} EntityChangedEventType */

export class ContentWindowEntityEditor extends ContentWindow {
	static contentWindowTypeId = "entityEditor";
	static contentWindowUiName = "Entity Editor";
	static contentWindowUiIcon = "static/icons/contentWindowTabs/entityEditor.svg";
	static scrollable = false;

	/** @typedef {"translate" | "rotate" | "scale"} TransformationMode */
	/** @typedef {"local" | "global"} TransformationSpace */
	/** @typedef {"center" | "multiple" | "last"} TransformationPivot */

	/**
	 * @typedef TransformationGizmoData
	 * @property {TranslationGizmo | RotationGizmo} gizmo
	 */

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

		/** @type {TransformationMode} */
		this.transformationMode = "translate";
		/** @type {TransformationSpace} */
		this.transformationSpace = "local";
		/** @type {TransformationPivot} */
		this.transformationPivot = "center";

		this.transformationModeTranslateButton = new Button({
			onClick: () => {
				this.setTransformationMode("translate");
			},
			icon: "static/icons/entityEditor/translate.svg",
			colorizerFilterManager: getEditorInstance().colorizerFilterManager,
			tooltip: "Translate Mode",
		});
		this.transformationModeRotateButton = new Button({
			onClick: () => {
				this.setTransformationMode("rotate");
			},
			icon: "static/icons/entityEditor/rotate.svg",
			colorizerFilterManager: getEditorInstance().colorizerFilterManager,
			tooltip: "Rotate Mode",
		});

		const translationMethodButtonGroup = new ButtonGroup(
			this.transformationModeTranslateButton,
			this.transformationModeRotateButton
		);
		this.addTopBarEl(translationMethodButtonGroup.el);

		this.transformationSpaceButton = new Button({
			onClick: () => {
				this.toggleTransformationSpace();
			},
			colorizerFilterManager: getEditorInstance().colorizerFilterManager,
			tooltip: "Transformation Space",
		});

		this.transformationPivotButton = new Button({
			onClick: () => {
				this.toggleTransformationPivot();
			},
			colorizerFilterManager: getEditorInstance().colorizerFilterManager,
			tooltip: "Transformation Pivot",
		});
		const pivotControlsGroup = new ButtonGroup(this.transformationSpaceButton, this.transformationPivotButton);
		this.addTopBarEl(pivotControlsGroup.el);

		this.domTarget = this.editorInstance.renderer.createDomTarget();
		const renderTargetElement = this.domTarget.getElement();
		renderTargetElement.style.display = "block";
		this.contentEl.appendChild(renderTargetElement);

		this.renderDirty = false;
		/** @type {Set<() => void>} */
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
		this.selectionGroup = this.editorInstance.selectionManager.createSelectionGroup();

		/** @type {Set<{projectAsset: import("../../assets/ProjectAsset.js").ProjectAssetAny, listener: () => void}>} */
		this.createdLiveAssetChangeListeners = new Set();

		this.gizmos = new GizmoManager(this.editorInstance.engineAssetManager);
		this.editorScene.add(this.gizmos.entity);
		this.gizmos.addPointerEventListeners(renderTargetElement, this.editorCamComponent);
		this.gizmos.onGizmoNeedsRender(() => {
			this.markRenderDirty(false);
		});

		/** @type {TransformationGizmoData[]} */
		this.activeTransformationGizmos = [];
		this.setTransformationMode("translate");
		this.updateTransformationSpaceButton();
		this.updateTransformationPivotButton();

		this.selectionGroup.onSelectionChange(() => {
			this.updateTransformationGizmos();
		});

		/** @type {Map<Entity, Map<import("../../../../src/mod.js").Component, import("../../componentGizmos/gizmos/ComponentGizmos.js").ComponentGizmosAny>>} */
		this.currentLinkedGizmos = new Map();

		this.persistentDataLoaded = false;
		this.ignoreNextPersistentDataOrbitChange = false;
		this.loadPersistentData();
	}

	async loadPersistentData() {
		const loadedEntityPath = await this.persistentData.get("loadedEntityPath");
		if (loadedEntityPath) {
			const castLoadedEntityPath = /** @type {string[]} */ (loadedEntityPath);
			const assetManager = await this.editorInstance.projectManager.getAssetManager();
			const assetUuid = await assetManager.getAssetUuidFromPath(castLoadedEntityPath);
			if (assetUuid) {
				this.loadEntityAsset(assetUuid, true);

				const lookPos = await this.persistentData.get("orbitLookPos");
				if (lookPos) {
					this.orbitControls.lookPos = /** @type {import("../../../../src/mod.js").Vec3} */ (lookPos);
				}
				const lookRot = await this.persistentData.get("orbitLookRot");
				if (lookRot) {
					this.orbitControls.lookRot = /** @type {import("../../../../src/mod.js").Quat} */ (lookRot);
				}
				const dist = await this.persistentData.get("orbitLookDist");
				if (dist != undefined) {
					this.orbitControls.lookDist = /** @type {number} */ (dist);
				}
				this.ignoreNextPersistentDataOrbitChange = true;
			}
		}
		this.persistentDataLoaded = true;
	}

	destructor() {
		super.destructor();

		this.domTarget.destructor();
		this.editorScene.destructor();
		this._editingEntity = null;
		this.selectionGroup.destructor();
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
			assertAssetType: [ProjectAssetTypeEntity, ProjectAssetTypeGltf],
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
						(async () => {
							try {
								await this.persistentData.flush();
							} catch (e) {
								if (e instanceof DOMException && e.name == "SecurityError") {
									// The flush was probably triggered by scrolling, which doesn't cause
									// transient activation. If this is the case a security error is thrown.
									// This is fine though, since storing the orbit state doesn't have a high priority.
								} else {
									throw e;
								}
							}
						})();
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

	/**
	 * @param {TransformationMode} mode
	 */
	setTransformationMode(mode) {
		this.transformationMode = mode;
		this.transformationModeTranslateButton.setSelectedHighlight(mode == "translate");
		this.transformationModeRotateButton.setSelectedHighlight(mode == "rotate");
		this.updateTransformationGizmos();
	}

	toggleTransformationSpace() {
		if (this.transformationSpace == "local") {
			this.transformationSpace = "global";
		} else {
			this.transformationSpace = "local";
		}
		this.updateTransformationSpaceButton();
		this.updateTransformationGizmos();
	}

	updateTransformationSpaceButton() {
		if (this.transformationSpace == "local") {
			this.transformationSpaceButton.setText("Local");
			this.transformationSpaceButton.setIcon("static/icons/entityEditor/local.svg");
		} else if (this.transformationSpace == "global") {
			this.transformationSpaceButton.setText("Global");
			this.transformationSpaceButton.setIcon("static/icons/entityEditor/global.svg");
		}
	}

	toggleTransformationPivot() {
		if (this.transformationPivot == "center") {
			this.transformationPivot = "multiple";
		} else if (this.transformationPivot == "multiple") {
			this.transformationPivot = "last";
		} else {
			this.transformationPivot = "center";
		}
		this.updateTransformationPivotButton();
		this.updateTransformationGizmos();
	}

	updateTransformationPivotButton() {
		if (this.transformationPivot == "center") {
			this.transformationPivotButton.setText("Center");
			this.transformationPivotButton.setIcon("static/icons/entityEditor/center.svg");
		} else if (this.transformationPivot == "multiple") {
			this.transformationPivotButton.setText("Multiple");
			this.transformationPivotButton.setIcon("static/icons/entityEditor/multiple.svg");
		} else if (this.transformationPivot == "last") {
			this.transformationPivotButton.setText("Last");
			this.transformationPivotButton.setIcon("static/icons/entityEditor/last.svg");
		}
	}

	/**
	 * Updates the amount and locations of gizmos used for moving objects.
	 */
	updateTransformationGizmos() {
		for (const {gizmo} of this.activeTransformationGizmos) {
			this.gizmos.removeGizmo(gizmo);
		}
		this.activeTransformationGizmos = [];

		for (const {pos, rot} of this.getEditingPivots()) {
			let gizmo;
			if (this.transformationMode == "translate") {
				gizmo = this.gizmos.addGizmo(TranslationGizmo);
				gizmo.onDrag(e => {
					const localMatrix = Mat4.createTranslation(e.localDelta);
					const worldMatrix = Mat4.createTranslation(e.localDelta);
					this.dragSelectedEntities(localMatrix, worldMatrix);
				});
			} else if (this.transformationMode == "rotate") {
				gizmo = this.gizmos.addGizmo(RotationGizmo);
			} else {
				throw new Error("Unknown transformation mode");
			}
			this.activeTransformationGizmos.push({gizmo});

			gizmo.pos = pos;
			gizmo.rot = rot;
		}
		this.markRenderDirty();
	}

	/**
	 * Returns a list of objects describing the transformation of a pivot. This is
	 * essentially a list of all the translation/rotation/scale gizmos that need
	 * to be rendered.
	 */
	getEditingPivots() {
		/**
		 * @typedef PivotData
		 * @property {Vec3} pos
		 * @property {Quat} rot
		 * @property {Entity[]} entities The entities that should be transformed when dragging a gizmo.
		 */

		/** @type {PivotData[]} */
		const pivots = [];

		if (this.transformationPivot == "center") {
			if (this.selectionGroup.currentSelectedObjects.length == 0) {
				return pivots;
			} else {
				const averagePos = new Vec3();
				let count = 0;
				const entities = [];
				for (const {entity} of this.selectionGroup.currentSelectedObjects) {
					averagePos.add(entity.worldPos);
					count++;
					entities.push(entity);
				}
				averagePos.divide(count);
				pivots.push({
					pos: averagePos,
					rot: Quat.identity,
					entities,
				});
				return pivots;
			}
		}

		/**
		 * List of entities that needs a pivot.
		 * @type {Set<Entity>}
		 */
		const entities = new Set();
		if (this.transformationPivot == "last") {
			const last = this.selectionGroup.currentSelectedObjects.at(-1);
			if (last) {
				entities.add(last.entity);
			}
		} else if (this.transformationPivot == "multiple") {
			for (const {entity} of this.selectionGroup.currentSelectedObjects) {
				entities.add(entity);
			}
			for (const a of entities) {
				for (const b of entities) {
					if (a.containsParent(b)) {
						entities.delete(a);
					}
				}
			}
		}

		for (const entity of entities) {
			const {pos, rot} = entity.worldMatrix.decompose();
			if (this.transformationSpace == "global") {
				rot.set(Quat.identity);
			}
			pivots.push({pos, rot, entities: [entity]});
		}

		return pivots;
	}

	/**
	 * Moves the selected entities (that have a visible gizmo) based on the
	 * current transformation settings.
	 * @param {Mat4} localMatrix
	 * @param {Mat4} globalMatrix
	 */
	dragSelectedEntities(localMatrix, globalMatrix) {
		let matrix;
		if (this.transformationSpace == "local") {
			matrix = localMatrix;
		} else if (this.transformationSpace == "global") {
			matrix = globalMatrix;
		} else {
			throw new Error("Unknown transformation space: " + this.transformationSpace);
		}

		for (const {entities} of this.getEditingPivots()) {
			for (const entity of entities) {
				if (this.transformationSpace == "local") {
					const newMatrix = entity.localMatrix;
					newMatrix.multiplyMatrix(matrix);
					entity.localMatrix = newMatrix;
				}
			}
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
						const castComponentB = /** @type {Object<string, unknown>} */ (castComponentA);
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
	 * @param {Object<string | number, unknown>} data
	 * @param {Object<string | number, unknown>?} parentObject
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
							const castChildData = /** @type {Object<string, unknown>} */ (childData);
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
