import { ContentWindow } from "../ContentWindow.js";
import { Button } from "../../../ui/Button.js";
import { CameraComponent, ClusteredLightsConfig, Entity, GizmoManager, Mat4, Material, MeshComponent, OrbitControls, Quat, TranslationGizmo, Vec3, VertexState, createPlane } from "../../../../../src/mod.js";
import { ProjectAssetTypeEntity } from "../../../assets/projectAssetType/ProjectAssetTypeEntity.js";
import { ProjectAssetTypeGltf } from "../../../assets/projectAssetType/ProjectAssetTypeGltf.js";
import { RotationGizmo } from "../../../../../src/gizmos/gizmos/RotationGizmo.js";
import { ButtonGroup } from "../../../ui/ButtonGroup.js";
import { ButtonSelectorGui } from "../../../ui/ButtonSelectorGui.js";
import { EntitySavingManager } from "./EntitySavingManager.js";
import { ScaleGizmo } from "../../../../../src/gizmos/gizmos/ScaleGizmo.js";
import { EntityChangeType } from "../../../assets/EntityAssetManager.js";
import { contentWindowEntityEditorSheet } from "../../../styles/shadowStyles.js";

export const ENTITY_EDITOR_CONTENT_WINDOW_ID = /** @type {const} */ ("renda:entityEditor");

/** @typedef {"create" | "delete" | "transform" | "component" | "componentProperty" | "rename"} EntityChangedEventType */

export class ContentWindowEntityEditor extends ContentWindow {
	static contentWindowTypeId = ENTITY_EDITOR_CONTENT_WINDOW_ID;
	static contentWindowUiName = "Entity Editor";
	static contentWindowUiIcon = "static/icons/contentWindowTabs/entityEditor.svg";
	static scrollable = false;

	/** @typedef {"translate" | "rotate" | "scale"} TransformationMode */
	/** @typedef {"local" | "global"} TransformationSpace */
	/** @typedef {"center" | "multiple" | "last"} TransformationPivot */

	/**
	 * @typedef TransformationGizmoData
	 * @property {Entity[]} entities The list of entities that the gizmo is controlling
	 * @property {TranslationGizmo | RotationGizmo | ScaleGizmo} gizmo
	 */

	/**
	 * @param {ConstructorParameters<typeof ContentWindow>} args
	 */
	constructor(...args) {
		super(...args);

		this.setContentBehindTopBar(true);

		this.addPreferencesButton([
			"entityEditor.autosaveEntities",
			"entityEditor.scrollBehavior",
			"entityEditor.invertScrollOrbitX",
			"entityEditor.invertScrollOrbitY",
			"entityEditor.showGrid",
		]);

		this.entitySavingManager = new EntitySavingManager(this.studioInstance, this);
		this.addTopBarEl(this.entitySavingManager.saveEntityButton.el);

		/** @type {TransformationMode} */
		this.transformationMode = "translate";
		/** @type {TransformationSpace} */
		this.transformationSpace = "local";
		/** @type {TransformationPivot} */
		this.transformationPivot = "center";

		this.translationModeSelector = new ButtonSelectorGui({
			items: [
				{
					icon: "static/icons/entityEditor/translate.svg",
					tooltip: "Translate Mode",
				},
				{
					icon: "static/icons/entityEditor/rotate.svg",
					tooltip: "Rotate Mode",
				},
				{
					icon: "static/icons/entityEditor/scale.svg",
					tooltip: "Scale Mode",
				},
			],
		});
		this.translationModeSelector.onValueChange(() => {
			this.#updateTranslationMode();
		});
		this.addTopBarEl(this.translationModeSelector.el);

		this.studioInstance.keyboardShortcutManager.onCommand("entityEditor.transform.translate", this.#translateKeyboardShortcutPressed);
		this.studioInstance.keyboardShortcutManager.onCommand("entityEditor.transform.rotate", this.#rotateKeyboardShortcutPressed);

		this.transformationSpaceButton = new Button({
			onClick: () => {
				this.toggleTransformationSpace();
			},
			tooltip: "Transformation Space",
		});

		this.transformationPivotButton = new Button({
			onClick: () => {
				this.toggleTransformationPivot();
			},
			tooltip: "Transformation Pivot",
		});
		const pivotControlsGroup = new ButtonGroup();
		pivotControlsGroup.addButton(this.transformationSpaceButton);
		pivotControlsGroup.addButton(this.transformationPivotButton);
		this.addTopBarEl(pivotControlsGroup.el);

		this.shadow = this.contentEl.attachShadow({ mode: "open" });
		this.shadow.adoptedStyleSheets = [contentWindowEntityEditorSheet];

		(async () => {
			const message = await this.studioInstance.rendererErrorMessage;
			if (message) {
				const el = document.createElement("div");
				el.classList.add("error-message");
				el.textContent = message;
				this.shadow.appendChild(el);
			}
		})();

		this.domTarget = this.studioInstance.renderer.createDomTarget();
		const renderTargetElement = this.domTarget.getElement();
		renderTargetElement.style.display = "block";
		this.shadow.appendChild(renderTargetElement);

		this.renderDirty = false;

		this.editorScene = new Entity("editorScene");
		this.editorCamera = new Entity("editorCamera");
		this.editorScene.add(this.editorCamera);
		this.editorCamComponent = this.editorCamera.addComponent(CameraComponent);
		this.editorCamComponent.clusteredLightsConfig = new ClusteredLightsConfig();

		this.grid = new Entity("grid");
		this.studioInstance.preferencesManager.onChange("entityEditor.showGrid", this.uuid, (e) => {
			if (e.value) {
				if (!this.grid.parent) {
					this.editorScene.add(this.grid);
					this.markRenderDirty();
				}
			} else {
				if (this.grid.parent) {
					this.editorScene.remove(this.grid);
					this.markRenderDirty();
				}
			}
		});
		const gridMeshComponent = this.grid.addComponent(MeshComponent, {
			materials: [],
		});
		this.studioInstance.engineAssetManager.watchAsset("12b5f619-5651-478d-8df1-642a23a43e3e", {
			assertionOptions: {
				assertInstanceType: Material,
			},
		}, (asset) => {
			gridMeshComponent.materials = [asset];
			this.markRenderDirty();
		});
		const gridMesh = createPlane({
			width: 500,
			height: 500,
			widthSegments: 10,
			heightSegments: 10,
		});
		gridMeshComponent.mesh = gridMesh;
		this.studioInstance.engineAssetManager.watchAsset("35fe0836-6ed6-42c1-83ab-06243aef04d2", {
			assertionOptions: {
				assertInstanceType: VertexState,
			},
		}, (asset) => {
			gridMesh.setVertexState(asset);
			this.markRenderDirty();
		});

		this.orbitControls = new OrbitControls(this.editorCamera, {
			eventElement: renderTargetElement,
			scrollHardwareDetector: this.studioInstance.scrollHardwareDetector,
		});
		/**
		 * Flag to check whether the current orbit values have been touched
		 * and should be written to disk.
		 */
		this.orbitControlsValuesDirty = false;
		this.lastOrbitControlsValuesChangeTime = 0;

		this.studioInstance.preferencesManager.onChange("entityEditor.scrollBehavior", this.uuid, (e) => {
			this.orbitControls.scrollBehavior = e.value;
		});
		this.studioInstance.preferencesManager.onChange("entityEditor.invertScrollOrbitX", this.uuid, (e) => {
			this.orbitControls.invertScrollX = e.value;
		});
		this.studioInstance.preferencesManager.onChange("entityEditor.invertScrollOrbitY", this.uuid, (e) => {
			this.orbitControls.invertScrollY = e.value;
		});

		/** @type {import("../../../../../src/mod.js").UuidString?} */
		this.editingEntityUuid = null;
		/** @private @type {Entity} */
		this._editingEntity = new Entity();
		this.#updateTrackedEntityCallback();
		this.editorScene.add(this._editingEntity);
		/** @type {import("../../../misc/SelectionGroup.js").SelectionGroup<import("../../../misc/EntitySelection.js").EntitySelection>} */
		this.selectionGroup = this.studioInstance.selectionManager.createSelectionGroup();

		/** @type {Set<{projectAsset: import("../../../assets/ProjectAsset.js").ProjectAssetAny, listener: () => void}>} */
		this.createdLiveAssetChangeListeners = new Set();

		this.gizmos = new GizmoManager(this.studioInstance.engineAssetManager);
		this.editorScene.add(this.gizmos.entity);
		this.gizmos.addPointerEventListeners(renderTargetElement, this.editorCamComponent);
		this.gizmos.onGizmoNeedsRender(() => {
			this.markRenderDirty();
		});

		/** @type {TransformationGizmoData[]} */
		this.activeTransformationGizmos = [];
		this.updateTransformationSpaceButton();
		this.updateTransformationPivotButton();
		this.#updateTranslationMode();

		this.selectionGroup.onSelectionChange(() => {
			this.updateTransformationGizmos();
		});

		/** @type {Map<Entity, Map<import("../../../../../src/mod.js").Component, import("../../../componentGizmos/gizmos/ComponentGizmos.js").ComponentGizmosAny>>} */
		this.currentLinkedGizmos = new Map();

		this.studioInstance.preferencesManager.onChange("entityEditor.orbitLookPos", this.uuid, (e) => {
			if (e.trigger == "application") return;
			if (!Array.isArray(e.value)) return;
			this.orbitControls.lookPos = new Vec3(/** @type {[number, number, number]} */ (e.value));
		});
		this.studioInstance.preferencesManager.onChange("entityEditor.orbitLookRot", this.uuid, (e) => {
			if (e.trigger == "application") return;
			if (!Array.isArray(e.value)) return;
			this.orbitControls.lookRot = new Quat(/** @type {[number, number, number, number]} */ (e.value));
		});
		this.studioInstance.preferencesManager.onChange("entityEditor.orbitLookDist", this.uuid, (e) => {
			if (e.trigger == "application") return;
			this.orbitControls.lookDist = e.value;
		});

		// TODO #467
		// We store the loaded entity by path rather than uuid because the entity might not have a persistent uuid.
		// We could make the uuid persistent but this would cause assetSettings.json to be updated.
		// assetSettings.json is expected to be tracked in version control and we don't want to surprise the user
		// with unexpected changed files.
		this.studioInstance.preferencesManager.onChange("entityEditor.loadedEntityPath", this.uuid, async (e) => {
			if (e.trigger == "application") return;
			if (Array.isArray(e.value)) {
				const castLoadedEntityPath = /** @type {string[]} */ (e.value);
				const assetManager = await this.studioInstance.projectManager.getAssetManager();
				const assetUuid = await assetManager.getAssetUuidFromPath(castLoadedEntityPath);
				if (assetUuid) {
					this.loadEntityAsset(assetUuid, true);
				}
			}
		});

		this.studioInstance.projectManager.onAssetManagerChange(this.#onAssetManagerChange);
	}

	destructor() {
		super.destructor();

		this.domTarget.destructor();
		this.editorScene.destructor();
		this.selectionGroup.destructor();
		this.gizmos.destructor();

		this.studioInstance.keyboardShortcutManager.removeOnCommand("entityEditor.transform.translate", this.#translateKeyboardShortcutPressed);
		this.studioInstance.keyboardShortcutManager.removeOnCommand("entityEditor.transform.rotate", this.#rotateKeyboardShortcutPressed);

		this.studioInstance.projectManager.assetManager?.entityAssetManager.removeOnTrackedEntityChange(this._editingEntity, this.#onTrackedEntityChange);
		this.studioInstance.projectManager.removeOnAssetManagerChange(this.#onAssetManagerChange);
	}

	get editingEntity() {
		return this._editingEntity;
	}

	set editingEntity(val) {
		if (this._editingEntity) {
			this.editorScene.remove(this._editingEntity);
		}
		this._editingEntity = val;
		const uuid = this.studioInstance.projectManager.assetManager?.entityAssetManager.getLinkedAssetUuid(val);
		this.editingEntityUuid = uuid || null;
		this.#updateTrackedEntityCallback();
		if (val) {
			this.editorScene.add(val);
		}
		this.updateGizmos();
		this.markRenderDirty();
		this.#notifyOutliners();
		this.updateLiveAssetChangeListeners();
	}

	/**
	 * Notify outliners that data about the currently edited entity has been changed.
	 * This should only fire when the root entity changes to a different reference, or the name of its asset for instance.
	 * This is used to update the list of available entity editors.
	 * Things like changes to children and components etc. should be handled by the EntityAssetManager.
	 */
	#notifyOutliners() {
		for (const outliner of this.studioInstance.windowManager.getContentWindows("renda:outliner")) {
			outliner.entityEditorUpdated({ target: this });
		}
	}

	#onAssetManagerChange = () => {
		this.#updateTrackedEntityCallback();
	};

	/** @type {import("../../../assets/EntityAssetManager.js").EntityAssetManager?} */
	#currentTrackedChangeManager = null;
	/** @type {Entity?} */
	#currentTrackedChangeEntity = null;

	#updateTrackedEntityCallback() {
		if (this.#currentTrackedChangeManager && this.#currentTrackedChangeEntity) {
			this.#currentTrackedChangeManager.removeOnTrackedEntityChange(this.#currentTrackedChangeEntity, this.#onTrackedEntityChange);
		}
		const entityAssetManager = this.studioInstance.projectManager.assetManager?.entityAssetManager;
		if (entityAssetManager) {
			entityAssetManager.onTrackedEntityChange(this._editingEntity, this.#onTrackedEntityChange);
			this.#currentTrackedChangeManager = entityAssetManager;
			this.#currentTrackedChangeEntity = this._editingEntity;
		}
	}

	/**
	 * @param {import("../../../assets/EntityAssetManager.js").OnTrackedEntityChangeEvent} e
	 */
	#onTrackedEntityChange = (e) => {
		const entityAssetManager = this.studioInstance.projectManager.assetManager?.entityAssetManager;
		if (entityAssetManager) {
			const newAssetUuid = entityAssetManager.getLinkedAssetUuid(this.editingEntity);
			if (this.editingEntityUuid != newAssetUuid) {
				this.editingEntityUuid = newAssetUuid;
				this.#notifyOutliners();
			}
		}
		if (!(e.type & EntityChangeType.Load) && e.sourceEntity == e.targetEntity && this.editingEntityUuid) {
			this.entitySavingManager.addDirtyEntity(e.targetEntity);
		}
		if (e.source === this) return;
		this.markRenderDirty();

		if (e.type & EntityChangeType.Transform) {
			for (const child of e.targetEntity.traverseDown()) {
				this.updateGizmoPositionsForEntity(child);
			}
			this.updateTransformationGizmos();
		} else if (e.type & EntityChangeType.Component) {
			this.updateGizmosForEntity(e.targetEntity);
		} else if (e.type & EntityChangeType.Delete) {
			this.updateGizmosForEntity(e.targetEntity, true);
		}
	};

	/**
	 * True when the currently editing entity exists as a project asset.
	 * False when a warning should be shown to the user that changes are not autosaved.
	 */
	get isEditingProjectEntity() {
		return Boolean(this.editingEntityUuid);
	}

	/**
	 * @override
	 * @param {number} w
	 * @param {number} h
	 */
	onWindowResize(w, h) {
		this.domTarget.resize(w, h);
		this.markRenderDirty();
	}

	markRenderDirty() {
		this.renderDirty = true;
	}

	newEmptyEditingEntity() {
		this.editingEntity = new Entity();
	}

	/**
	 * @param {import("../../../../../src/util/mod.js").UuidString} entityUuid
	 * @param {boolean} fromContentWindowLoad
	 */
	async loadEntityAsset(entityUuid, fromContentWindowLoad = false) {
		const assetManager = await this.studioInstance.projectManager.getAssetManager();
		const projectAsset = await assetManager.getProjectAssetFromUuid(entityUuid, {
			assertAssetType: [ProjectAssetTypeEntity, ProjectAssetTypeGltf],
		});
		if (!projectAsset) {
			this.newEmptyEditingEntity();
			return;
		}
		const entity = assetManager.entityAssetManager.createTrackedEntity(entityUuid);
		this.editingEntity = entity;
		this.entitySavingManager.clearDirtyEntities();
		if (!fromContentWindowLoad) {
			this.studioInstance.preferencesManager.set("entityEditor.loadedEntityPath", projectAsset.path, {
				contentWindowUuid: this.uuid,
				location: "contentwindow-project",
			});
		}
	}

	/**
	 * Sets a preference but only if it has been changed.
	 * @param {"entityEditor.orbitLookPos" | "entityEditor.orbitLookRot"} preference
	 * @param {number[]} newValue
	 */
	#setOrbitPreference(preference, newValue) {
		const currentValue = this.studioInstance.preferencesManager.get(preference, this.uuid);
		if (currentValue && Array.isArray(currentValue) && currentValue.length == newValue.length) {
			let same = true;
			for (let i = 0; i < currentValue.length; i++) {
				if (currentValue[i] != newValue[i]) {
					same = false;
					break;
				}
			}
			if (same) return;
		}
		this.studioInstance.preferencesManager.set(preference, newValue, {
			contentWindowUuid: this.uuid,
			location: "contentwindow-project",
			flush: false,
		});
		this.orbitControlsValuesDirty = true;
	}

	loop() {
		const camChanged = this.orbitControls.loop();
		if (camChanged) {
			this.markRenderDirty();

			// We only want to save the orbit state when a project entity is loaded.
			// Otherwise, empty projects will be marked as worth saving even though nothing was changed.
			if (this.isEditingProjectEntity) {
				this.#setOrbitPreference("entityEditor.orbitLookPos", this.orbitControls.lookPos.toArray());
				this.#setOrbitPreference("entityEditor.orbitLookRot", this.orbitControls.lookRot.toArray());

				const currentDist = this.studioInstance.preferencesManager.get("entityEditor.orbitLookDist", this.uuid);
				if (this.orbitControls.lookDist != currentDist) {
					this.studioInstance.preferencesManager.set("entityEditor.orbitLookDist", this.orbitControls.lookDist, {
						contentWindowUuid: this.uuid,
						location: "contentwindow-project",
						flush: false,
					});
					this.orbitControlsValuesDirty = true;
				}

				if (this.orbitControlsValuesDirty) {
					this.lastOrbitControlsValuesChangeTime = Date.now();
				}
			}
		}

		// Add a delay to the flush to prevent it from flushing with every scroll event.
		if (this.isEditingProjectEntity && this.orbitControlsValuesDirty && Date.now() - this.lastOrbitControlsValuesChangeTime > 1000) {
			(async () => {
				try {
					await this.studioInstance.preferencesManager.flush();
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
			this.orbitControlsValuesDirty = false;
		}

		if (this.renderDirty && this.studioInstance.renderer.isInit) {
			this.render();
			this.renderDirty = false;
		}
	}

	render() {
		this.domTarget.render(this.editorCamComponent);
	}

	#updateTranslationMode() {
		if (this.translationModeSelector.value == 0) {
			this.setTransformationMode("translate");
		} else if (this.translationModeSelector.value == 1) {
			this.setTransformationMode("rotate");
		} else if (this.translationModeSelector.value == 2) {
			this.setTransformationMode("scale");
		}
	}

	/**
	 * @param {import("../../../keyboardShortcuts/KeyboardShortcutManager.js").CommandCallbackEvent} e
	 */
	#translateKeyboardShortcutPressed = (e) => {
		const holdState = e.command.holdStateActive;
		if (holdState) {
			this.setTransformationMode("translate");
		}
		const gizmo = this.getMainTransformationGizmo();
		if (gizmo && gizmo instanceof TranslationGizmo) {
			gizmo.setIsDragging(holdState);
			const dragEndCb = () => {
				e.command.setHoldStateActive(false);
				gizmo.removeOnDragEnd(dragEndCb);
			};
			gizmo.onDragEnd(dragEndCb);
		}
	};

	/**
	 * @param {import("../../../keyboardShortcuts/KeyboardShortcutManager.js").CommandCallbackEvent} e
	 */
	#rotateKeyboardShortcutPressed = (e) => {
		const holdState = e.command.holdStateActive;
		if (holdState) {
			this.setTransformationMode("rotate");
		}
	};

	/**
	 * @param {TransformationMode} mode
	 */
	setTransformationMode(mode) {
		if (this.transformationMode == mode) return;
		this.transformationMode = mode;
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
		const oldTransformationGizmos = new Set(this.activeTransformationGizmos);
		this.activeTransformationGizmos = [];

		/**
		 * @param {TransformationMode} gizmoType
		 * @param {Entity[]} entities
		 */
		const findExistingGizmo = (gizmoType, entities) => {
			let expectedType;
			if (gizmoType == "translate") {
				expectedType = TranslationGizmo;
			} else if (gizmoType == "rotate") {
				expectedType = RotationGizmo;
			} else if (gizmoType == "scale") {
				expectedType = ScaleGizmo;
			} else {
				throw new Error("Unknown transformation mode");
			}
			for (const oldGizmoData of oldTransformationGizmos) {
				const { gizmo, entities: gizmoEntities } = oldGizmoData;
				const castConstructor = /** @type {typeof TranslationGizmo | typeof RotationGizmo | typeof ScaleGizmo} */ (gizmo.constructor);
				if (castConstructor != expectedType) continue;
				for (const entity of entities) {
					if (!gizmoEntities.includes(entity)) continue;
				}
				for (const entity of gizmoEntities) {
					if (!entities.includes(entity)) continue;
				}
				oldTransformationGizmos.delete(oldGizmoData);
				return gizmo;
			}
			return null;
		};

		for (const { matrix, entities } of this.getEditingPivots()) {
			let gizmo = findExistingGizmo(this.transformationMode, entities);
			if (!gizmo) {
				if (this.transformationMode == "translate") {
					gizmo = this.gizmos.addGizmo(TranslationGizmo);
					gizmo.onDrag((e) => {
						const localMatrix = Mat4.createTranslation(e.localDelta);
						this.dragSelectedEntities(localMatrix);
					});
				} else if (this.transformationMode == "rotate") {
					gizmo = this.gizmos.addGizmo(RotationGizmo);
					gizmo.onDrag((e) => {
						const localMatrix = Mat4.createRotation(e.localDelta);
						this.dragSelectedEntities(localMatrix);
					});
				} else if (this.transformationMode == "scale") {
					gizmo = this.gizmos.addGizmo(ScaleGizmo);
					gizmo.onDrag((e) => {
						const localMatrix = Mat4.createScale(e.localDelta);
						this.dragSelectedEntities(localMatrix);
					});
				} else {
					throw new Error("Unknown transformation mode");
				}
			}
			this.activeTransformationGizmos.push({ gizmo, entities });

			const { pos, rot } = matrix.decompose();
			gizmo.pos = pos;
			gizmo.rot = rot;
		}
		for (const { gizmo } of oldTransformationGizmos.values()) {
			this.gizmos.removeGizmo(gizmo);
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
		 * @property {Mat4} matrix
		 * @property {Entity[]} entities The entities that should be transformed when dragging a gizmo.
		 */

		/** @type {PivotData[]} */
		const pivots = [];
		let forceLast = false;

		if (this.transformationPivot == "center") {
			if (this.selectionGroup.currentSelectedObjects.length == 0) {
				return pivots;
			} else if (this.selectionGroup.currentSelectedObjects.length == 1) {
				// If only one item is selected, we want to use the same behaviour
				// as if the user had selected 'last'
				forceLast = true;
			} else {
				const averagePos = new Vec3();
				let count = 0;
				const entities = [];
				for (const { entity } of this.selectionGroup.currentSelectedObjects) {
					averagePos.add(entity.worldPos);
					count++;
					entities.push(entity);
				}
				averagePos.divide(count);
				pivots.push({
					matrix: Mat4.createTranslation(averagePos),
					entities,
				});
				return pivots;
			}
		}

		/**
		 * @param {Entity} entity The entity to derive the pivot pos and rot from.
		 * @param {Entity[]} entities List of entities that will be using this pivot.
		 */
		const createPivotData = (entity, entities) => {
			let matrix;
			if (this.transformationSpace == "global") {
				matrix = Mat4.createTranslation(entity.worldPos);
			} else if (this.transformationSpace == "local") {
				matrix = entity.worldMatrix.clone();
				matrix.premultiplyMatrix(Mat4.createScale(matrix.getScale()).invert());
			} else {
				throw new Error(`Unknown transformation space: "${this.transformationSpace}"`);
			}
			/** @type {PivotData} */
			const pivotData = { matrix, entities };
			return pivotData;
		};

		if (this.transformationPivot == "last" || forceLast) {
			const last = this.selectionGroup.currentSelectedObjects.at(-1);
			if (last) {
				const entities = this.selectionGroup.currentSelectedObjects.map((s) => s.entity);
				pivots.push(createPivotData(last.entity, entities));
			}
		} else if (this.transformationPivot == "multiple") {
			/** @type {Set<Entity>} */
			const entities = new Set();
			for (const { entity } of this.selectionGroup.currentSelectedObjects) {
				entities.add(entity);
			}
			for (const a of entities) {
				for (const b of entities) {
					if (a.containsParent(b)) {
						entities.delete(a);
					}
				}
			}

			for (const entity of entities) {
				pivots.push(createPivotData(entity, [entity]));
			}
		}

		return pivots;
	}

	/**
	 * Returns the transformation gizmo that controls the most recently selected object.
	 */
	getMainTransformationGizmo() {
		const last = this.selectionGroup.currentSelectedObjects.at(-1);
		if (!last) return null;

		for (const { entities, gizmo } of this.activeTransformationGizmos) {
			if (entities.includes(last.entity)) {
				return gizmo;
			}
		}
		return null;
	}

	/**
	 * Moves the selected entities (that have a visible gizmo) based on the
	 * current transformation settings.
	 * @param {Mat4} dragMatrix
	 */
	dragSelectedEntities(dragMatrix) {
		for (const { matrix: pivotMatrix, entities } of this.getEditingPivots()) {
			const pivotDragMatrix = Mat4.multiplyMatrices(dragMatrix, pivotMatrix);
			pivotDragMatrix.premultiplyMatrix(pivotMatrix.inverse());
			for (const entity of entities) {
				entity.worldMatrix.multiplyMatrix(pivotDragMatrix);
				this.studioInstance.projectManager.assetManager?.entityAssetManager.updateEntityTransform(entity, this);
			}
		}
	}

	updateGizmos() {
		const unusedEntities = new Map(this.currentLinkedGizmos);
		for (const child of this.editingEntity.traverseDown()) {
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
				let componentGizmos = linkedComponentGizmos.get(component) ?? null;
				if (!componentGizmos) {
					const componentConstructor = /** @type {typeof import("../../../../../src/mod.js").Component} */ (component.constructor);
					componentGizmos = this.studioInstance.componentGizmosManager.createComponentGizmosInstance(componentConstructor, component, this.gizmos);
					if (componentGizmos) {
						componentGizmos.entityMatrixChanged(entity.worldMatrix.clone());
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
				componentGizmos.entityMatrixChanged(entity.worldMatrix.clone());
			}
		}
	}

	updateLiveAssetChangeListeners() {
		for (const { projectAsset, listener } of this.createdLiveAssetChangeListeners) {
			projectAsset.removeOnLiveAssetNeedsReplacement(listener);
		}
		this.createdLiveAssetChangeListeners.clear();

		for (const child of this.editingEntity.traverseDown()) {
			for (const component of child.components) {
				const componentConstructor = /** @type {typeof import("../../../../../src/mod.js").Component} */ (component.constructor);
				if (componentConstructor.guiStructure) {
					const castComponentA = /** @type {unknown} */ (component);
					const castComponentB = /** @type {Object<string, unknown>} */ (castComponentA);
					/** @type {import("../../../ui/propertiesTreeView/types.ts").PropertiesTreeViewEntryOptions} */
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

	/**
	 * @param {import("../../../../../src/mod.js").Component} rootComponent
	 * @param {import("../../../ui/propertiesTreeView/types.ts").PropertiesTreeViewEntryOptions} structure
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
				/** @type {import("../../../ui/propertiesTreeView/types.ts").PropertiesTreeViewEntryOptionsGeneric<any>} */
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
				const assetManager = this.studioInstance.projectManager.assertAssetManagerExists();
				const projectAsset = assetManager.getProjectAssetForLiveAsset(data);
				if (projectAsset) {
					const listener = async () => {
						if (!propertyChangeName) return;
						parentObject[propertyChangeName] = await projectAsset.getLiveAsset();
						if (rootComponent.entity) {
							this.studioInstance.projectManager.assetManager?.entityAssetManager.updateEntity(rootComponent.entity, EntityChangeType.ComponentProperty, this);
						}
					};
					projectAsset.onLiveAssetNeedsReplacement(listener);
					this.createdLiveAssetChangeListeners.add({ projectAsset, listener });
				}
			}
		}
	}

	notifyMaterialChanged() {
		this.markRenderDirty();
	}
}
