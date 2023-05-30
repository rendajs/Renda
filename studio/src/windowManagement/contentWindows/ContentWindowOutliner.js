import {ContentWindow} from "./ContentWindow.js";
import {TreeView} from "../../ui/TreeView.js";
import {Button} from "../../ui/Button.js";
import {Entity} from "../../../../src/mod.js";
import {ContentWindowEntityEditor} from "./ContentWindowEntityEditor/ContentWindowEntityEditor.js";
import {ProjectAssetTypeEntity} from "../../assets/projectAssetType/ProjectAssetTypeEntity.js";
import {parseMimeType} from "../../util/util.js";
import {EntitySelection} from "../../misc/EntitySelection.js";
import {DropDownGui} from "../../ui/DropDownGui.js";
import {EntityChangeType} from "../../assets/EntityAssetManager.js";

export class ContentWindowOutliner extends ContentWindow {
	static contentWindowTypeId = /** @type {const} */ ("renda:outliner");
	static contentWindowUiName = "Outliner";
	static contentWindowUiIcon = "static/icons/contentWindowTabs/outliner.svg";

	/** @type {import("../../assets/EntityAssetManager.js").OnTrackedEntityChangeCallback?} */
	#currentOnEntityChangeCallback = null;
	/** @type {Entity?} */
	#currentOnEntityChangeEntity = null;

	/** @type {Map<TreeView, import("../../../../src/mod.js").UuidString>} */
	#draggingTreeViewUuids = new Map();

	/**
	 * @param {ConstructorParameters<typeof ContentWindow>} args
	 */
	constructor(...args) {
		super(...args);

		this.treeView = new TreeView();
		this.treeView.rearrangeableHierarchy = true;
		this.treeView.rearrangeableOrder = true;
		this.treeView.renameable = true;
		this.contentEl.appendChild(this.treeView.el);
		this.treeView.addEventListener("selectionchange", this.onTreeViewSelectionChange.bind(this));
		this.treeView.addEventListener("namechange", this.onTreeViewNameChange.bind(this));
		this.treeView.addEventListener("contextmenu", this.onTreeViewContextMenu.bind(this));
		this.treeView.addEventListener("dragstart", this.#onTreeViewDragStart);
		this.treeView.addEventListener("dragend", this.#onTreeViewDragEnd);
		this.treeView.addEventListener("validatedrag", this.onTreeViewValidatedrag.bind(this));
		this.treeView.addEventListener("rearrange", this.onTreeViewRearrange.bind(this));
		this.treeView.addEventListener("drop", this.onTreeViewDrop.bind(this));

		/** @type {ContentWindowEntityEditor?} */
		this.linkedEntityEditor = null;

		const createEmptyButton = new Button({
			text: "+",
			tooltip: "Add Entity",
			onClick: () => {
				this.createNewEmpty();
			},
		});
		this.addTopBarEl(createEmptyButton.el);

		/** @type {import("../../../../src/mod.js").UuidString[]} */
		this.availableEntityEditorUuids = [];
		this.selectEntityEditorDropDown = new DropDownGui();
		this.selectEntityEditorDropDown.onValueChange(() => {
			const index = this.selectEntityEditorDropDown.getValue({getAsString: false});
			const uuid = this.availableEntityEditorUuids[index];
			const entityEditor = /** @type {ContentWindowEntityEditor} */ (this.studioInstance.windowManager.getContentWindowByUuid(uuid));
			this.setLinkedEntityEditor(entityEditor);
		});
		this.selectEntityEditorDropDownContainer = document.createElement("div");
		// todo: there's probably a prettier way to do this but I don't know how right now
		// maybe items in the top bar should use flexbox?
		this.selectEntityEditorDropDownContainer.style.display = "inline-block";
		this.addTopBarEl(this.selectEntityEditorDropDownContainer);

		this.boundEntityEditorUpdated = this.entityEditorUpdated.bind(this);
		this.updateAvailableEntityEditorsList();
		this.setAvailableLinkedEntityEditor();
	}

	init() {
		this.windowManager.contentWindowAddedHandler.addEventListener(ContentWindowEntityEditor, this.boundEntityEditorUpdated);
		this.windowManager.contentWindowRemovedHandler.addEventListener(ContentWindowEntityEditor, this.boundEntityEditorUpdated);
	}

	destructor() {
		super.destructor();
		this.windowManager.contentWindowAddedHandler.removeEventListener(ContentWindowEntityEditor, this.boundEntityEditorUpdated);
		this.windowManager.contentWindowRemovedHandler.removeEventListener(ContentWindowEntityEditor, this.boundEntityEditorUpdated);
		this.treeView.destructor();
		this.linkedEntityEditor = null;
	}

	get selectionGroup() {
		return this.linkedEntityEditor?.selectionGroup ?? null;
	}

	/**
	 * @param {import("../WindowManager.js").ContentWindowEvent} e
	 */
	entityEditorUpdated(e) {
		this.updateAvailableEntityEditorsList();
		if (!this.linkedEntityEditor || this.linkedEntityEditor.destructed) {
			this.setAvailableLinkedEntityEditor();
		} else if (e.target == this.linkedEntityEditor) {
			this.updateFullTreeView();
		}
	}

	updateAvailableEntityEditorsList() {
		this.availableEntityEditorUuids = [];
		const dropDownItems = [];
		for (const entityEditor of this.windowManager.getContentWindows("renda:entityEditor")) {
			this.availableEntityEditorUuids.push(entityEditor.uuid);

			let entityAssetName = null;
			if (entityEditor.editingEntityUuid) {
				const assetManager = this.studioInstance.projectManager.assertAssetManagerExists();
				const editingEntityAsset = assetManager.getProjectAssetFromUuidSync(entityEditor.editingEntityUuid);
				if (editingEntityAsset) {
					entityAssetName = editingEntityAsset.fileName;
				} else {
					entityAssetName = "<missing>";
				}
			} else {
				entityAssetName = "<empty>";
			}
			dropDownItems.push(entityAssetName);
		}
		if (dropDownItems.length > 1) {
			this.selectEntityEditorDropDown.setItems(dropDownItems);
			if (this.linkedEntityEditor) {
				this.selectEntityEditorDropDown.value = this.availableEntityEditorUuids.indexOf(this.linkedEntityEditor.uuid);
			}
			this.selectEntityEditorDropDownContainer.appendChild(this.selectEntityEditorDropDown.el);
		} else if (this.selectEntityEditorDropDownContainer.children.length > 0) {
			this.selectEntityEditorDropDownContainer.removeChild(this.selectEntityEditorDropDown.el);
		}
	}

	setAvailableLinkedEntityEditor() {
		const entityEditor = this.windowManager.getMostSuitableContentWindow("renda:entityEditor", false);
		if (entityEditor) {
			this.setLinkedEntityEditor(entityEditor);
			this.selectEntityEditorDropDown.value = this.availableEntityEditorUuids.indexOf(entityEditor.uuid);
		}
	}

	/**
	 * @param {ContentWindowEntityEditor} linkedEntityEditor
	 */
	setLinkedEntityEditor(linkedEntityEditor) {
		this.linkedEntityEditor = linkedEntityEditor;
		this.updateFullTreeView();
	}

	updateFullTreeView() {
		if (this.linkedEntityEditor) {
			const assetManager = this.studioInstance.projectManager.assetManager;
			if (!assetManager) {
				this.treeView.clearChildren();
				this.treeView.name = "";
			} else {
				if (this.#currentOnEntityChangeCallback && this.#currentOnEntityChangeEntity) {
					assetManager.entityAssetManager.removeOnTrackedEntityChange(this.#currentOnEntityChangeEntity, this.#currentOnEntityChangeCallback);
				}
				this.#currentOnEntityChangeCallback = event => {
					if (event.type & EntityChangeType.Hierarchy) {
						const childTreeView = this.#getTreeViewByEntity(event.entity);
						if (!childTreeView) {
							throw new Error("Assertion failed, child treeview wasn't found");
						}
						this.updateTreeViewRecursive(childTreeView, event.entity, {assetManager});
					}
				};
				this.#currentOnEntityChangeEntity = this.linkedEntityEditor.editingEntity;
				assetManager.entityAssetManager.onTrackedEntityChange(this.linkedEntityEditor.editingEntity, this.#currentOnEntityChangeCallback);

				this.updateTreeViewRecursive(this.treeView, this.linkedEntityEditor.editingEntity, {
					assetManager,
				});
			}
		}
	}

	/**
	 * @typedef UpdateTreeViewRecursiveContext
	 * @property {import("../../assets/AssetManager.js").AssetManager} assetManager
	 */

	/**
	 * @param {TreeView} treeView
	 * @param {Entity} entity
	 * @param {UpdateTreeViewRecursiveContext} ctx
	 */
	updateTreeViewRecursive(treeView, entity, ctx) {
		treeView.name = entity.name;
		treeView.clearChildren();

		if (!treeView.collapsed) {
			for (const child of entity.getChildren()) {
				const childTreeView = treeView.addChild();

				const rootUuid = ctx.assetManager.entityAssetManager.getLinkedAssetUuid(child);
				if (rootUuid) {
					childTreeView.addIcon("static/icons/contentWindowTabs/defaultAssetLinks.svg");
				}

				this.updateTreeViewRecursive(childTreeView, child, ctx);
			}
		}
	}

	createNewEmpty() {
		this.createNew("Entity");
	}

	/**
	 * @param {string} name
	 */
	createNew(name) {
		if (!this.linkedEntityEditor) return;
		const rootEntity = this.linkedEntityEditor.editingEntity;
		const createdEntities = [];
		// todo: use selection manager
		for (const indicesPath of this.treeView.getSelectionIndices()) {
			const entity = rootEntity.getEntityByIndicesPath(indicesPath);
			if (!entity) continue;
			const createdEntity = new Entity(name);
			entity.add(createdEntity);
			createdEntities.push(createdEntity);
		}
		if (createdEntities.length == 0) {
			const createdEntity = new Entity(name);
			rootEntity.add(createdEntity);
			createdEntities.push(createdEntity);
		}
		const entityAssetManager = this.#getEntityAssetManager();
		/** @type {Set<Entity>} */
		const parents = new Set();
		for (const entity of createdEntities) {
			if (entity.parent) parents.add(entity.parent);
			this.notifyEntityEditors(entity, "create");
		}
		for (const parent of parents) {
			entityAssetManager.updateEntity(parent, EntityChangeType.Create);
		}
		this.updateFullTreeView();
		return createdEntities;
	}

	/**
	 * @param {TreeView} treeView
	 */
	#getEntityByTreeView(treeView) {
		const indicesPath = treeView.getIndicesPath();
		const entity = this.#getEntityByIndicesPath(indicesPath);
		if (!entity) {
			throw new Error("Assertion failed, entity not found");
		}
		return entity;
	}

	/**
	 * @param {Entity} entity
	 */
	#getTreeViewByEntity(entity) {
		if (!this.linkedEntityEditor) return null;
		const rootEntity = this.linkedEntityEditor.editingEntity;
		const indicesPath = entity.getIndicesPath({forcedRoot: rootEntity});
		const treeView = this.treeView.findChildFromIndicesPath(indicesPath);
		return treeView;
	}

	/**
	 * @param {number[]} indicesPath
	 * @returns {Entity?}
	 */
	#getEntityByIndicesPath(indicesPath) {
		if (!this.linkedEntityEditor) return null;
		return this.linkedEntityEditor.editingEntity.getEntityByIndicesPath(indicesPath);
	}

	/**
	 * @param {import("../../ui/TreeView.js").TreeViewSelectionChangeEvent} e
	 */
	onTreeViewSelectionChange(e) {
		if (!this.linkedEntityEditor || !this.selectionGroup) return;
		/** @type {import("../../misc/SelectionGroup.js").SelectionGroupChangeData<EntitySelection>} */
		const changeData = {
			added: this.mapSelectionChangeData(e.added),
			removed: this.mapSelectionChangeData(e.removed),
			reset: e.reset,
		};
		this.selectionGroup.changeSelection(changeData);
	}

	/**
	 * @override
	 * @param {boolean} mayChangeFocus
	 */
	activate(mayChangeFocus) {
		if (mayChangeFocus) this.treeView.focusIfNotFocused();
		this.selectionGroup?.activate();
	}

	/**
	 * @param {TreeView[]} treeViews
	 */
	mapSelectionChangeData(treeViews) {
		return treeViews.map(treeView => {
			const entity = this.#getEntityByTreeView(treeView);
			return new EntitySelection(entity, {
				outlinerTreeView: treeView,
				outliner: this,
			});
		});
	}

	#getEntityAssetManager() {
		const assetManager = this.studioInstance.projectManager.assertAssetManagerExists();
		return assetManager.entityAssetManager;
	}

	/**
	 * @param {import("../../ui/TreeView.js").TreeViewNameChangeEvent} e
	 */
	onTreeViewNameChange(e) {
		const entity = this.#getEntityByTreeView(e.target);
		const newName = e.target.name;
		const oldName = entity.name;
		if (newName != oldName) {
			let needsUpdate = false;
			const entityAssetManager = this.#getEntityAssetManager();
			this.studioInstance.historyManager.executeEntry({
				uiText: "Rename entity",
				redo: () => {
					entity.name = newName;
					if (needsUpdate) {
						this.updateFullTreeView();
					} else {
						// We don't need to update the first time, since the
						// treeview has already been renamed by the user
						needsUpdate = true;
					}
					entityAssetManager.updateEntity(entity, EntityChangeType.Rename);
					this.notifyEntityEditors(entity, "rename");
				},
				undo: () => {
					entity.name = oldName;
					this.updateFullTreeView();
					entityAssetManager.updateEntity(entity, EntityChangeType.Rename);
					this.notifyEntityEditors(entity, "rename");
				},
			});
		}
	}

	/**
	 * @param {import("../../ui/TreeView.js").TreeViewContextMenuEvent} e
	 */
	async onTreeViewContextMenu(e) {
		const menu = await e.showContextMenu();
		menu.createStructure([
			{
				text: "Delete",
				onClick: () => {
					const parentTreeView = e.target.parent;
					if (!parentTreeView) {
						throw new Error("Failed to delete entity, entity not attached to a parent");
					}
					const parentEntity = this.#getEntityByTreeView(parentTreeView);
					const entity = this.#getEntityByTreeView(e.target);
					const index = parentEntity.children.indexOf(entity);
					const entityAssetManager = this.#getEntityAssetManager();
					this.studioInstance.historyManager.executeEntry({
						uiText: "Delete entity",
						redo: () => {
							parentEntity.remove(entity);
							this.updateFullTreeView();
							entityAssetManager.updateEntity(parentEntity, EntityChangeType.Delete);
							this.notifyEntityEditors(entity, "delete");
						},
						undo: () => {
							parentEntity.addAtIndex(entity, index);
							this.updateFullTreeView();
							entityAssetManager.updateEntity(entity, EntityChangeType.Create);
							this.notifyEntityEditors(entity, "create");
						},
					});
				},
			},
		]);
	}

	/**
	 * @param {import("../../ui/TreeView.js").TreeViewDragEvent} e
	 */
	#onTreeViewDragStart = e => {
		const entity = this.#getEntityByTreeView(e.target);
		const draggingDataUuid = this.studioInstance.dragManager.registerDraggingData(entity);
		this.#draggingTreeViewUuids.set(e.target, draggingDataUuid);
		if (!e.rawEvent.dataTransfer) return;
		e.rawEvent.dataTransfer.setData(`text/renda; dragtype=outlinertreeview; draggingdata=${draggingDataUuid}`, "");
		e.rawEvent.dataTransfer.effectAllowed = "all";
	};

	/**
	 * @param {import("../../ui/TreeView.js").TreeViewDragEvent} e
	 */
	#onTreeViewDragEnd = e => {
		const uuid = this.#draggingTreeViewUuids.get(e.target);
		if (uuid) {
			this.studioInstance.dragManager.unregisterDraggingData(uuid);
		}
	};

	/**
	 * @param {import("../../ui/TreeView.js").TreeViewValidateDragEvent} e
	 */
	onTreeViewValidatedrag(e) {
		if (!e.isSameTreeView && this.validateDragMimeType(e.mimeType)) {
			e.accept();
		}
	}

	/**
	 * @param {import("../../util/util.js").ParsedMimeType} mimeType
	 * @returns {import("./ContentWindowProject.js").DraggingProjectAssetData | null}
	 */
	validateDragMimeType(mimeType) {
		if (mimeType.type == "text" &&
			mimeType.subType == "renda" &&
			mimeType.parameters.dragtype == "projectasset"
		) {
			const dragData = /** @type {import("./ContentWindowProject.js").DraggingProjectAssetData} */ (this.studioInstance.dragManager.getDraggingData(mimeType.parameters.draggingdata));
			if (dragData.assetType == ProjectAssetTypeEntity) {
				return dragData;
			}
		}
		return null;
	}

	/**
	 * @param {import("../../ui/TreeView.js").TreeViewRearrangeEvent} e
	 */
	onTreeViewRearrange(e) {
		/** @type {{entity: Entity, oldParent: Entity, newParent: Entity, insertIndex: number | undefined, removeIndex: number}[]} */
		const actions = [];
		for (const movedItem of e.movedItems) {
			const entity = this.#getEntityByIndicesPath(movedItem.oldIndicesPath);
			const oldParent = this.#getEntityByIndicesPath(movedItem.oldIndicesPath.slice(0, -1));
			const parentIndicesPath = movedItem.newIndicesPath.slice(0, -1);
			const insertIndex = movedItem.newIndicesPath.at(-1);
			const newParent = this.#getEntityByIndicesPath(parentIndicesPath);
			if (!entity || !oldParent || !newParent) {
				throw new Error("Failed to rearrange entities");
			}
			const removeIndex = oldParent.children.indexOf(entity);
			actions.push({entity, oldParent, newParent, insertIndex, removeIndex});
		}
		this.studioInstance.historyManager.executeEntry({
			uiText: actions.length > 1 ? "Rearrange entities" : "Rearrange entity",
			redo: () => {
				for (const action of actions) {
					action.oldParent.remove(action.entity);
					action.newParent.addAtIndex(action.entity, action.insertIndex);
				}
				this.updateFullTreeView();
			},
			undo: () => {
				for (let i = actions.length - 1; i >= 0; i--) {
					const action = actions[i];
					action.newParent.remove(action.entity);
					action.oldParent.addAtIndex(action.entity, action.removeIndex);
				}
				this.updateFullTreeView();
			},
		});
	}

	/**
	 * @param {import("../../ui/TreeView.js").TreeViewDragEvent} e
	 */
	async onTreeViewDrop(e) {
		const parent = this.#getEntityByTreeView(e.target);
		if (!e.rawEvent.dataTransfer) return;
		let didDropAsset = false;
		for (const item of e.rawEvent.dataTransfer.items) {
			const mimeType = parseMimeType(item.type);
			if (!mimeType) continue;
			const dragData = this.validateDragMimeType(mimeType);
			if (dragData && dragData.dataPopulated && dragData.assetUuid) {
				const entityAssetUuid = dragData.assetUuid;
				const assetManager = await this.studioInstance.projectManager.getAssetManager();
				const projectAsset = await assetManager.getProjectAssetFromUuid(entityAssetUuid, {
					assertAssetType: ProjectAssetTypeEntity,
				});
				if (!projectAsset) throw new Error(`Assertion failed, project asset with uuid ${entityAssetUuid} not found`);
				await assetManager.makeAssetUuidPersistent(projectAsset);
				const entityAsset = await projectAsset.getLiveAsset();
				if (entityAsset) {
					const clonedEntity = assetManager.entityAssetManager.createTrackedEntity(projectAsset.uuid);
					parent.add(clonedEntity);
					didDropAsset = true;
				}
			}
		}
		if (didDropAsset) {
			this.updateFullTreeView();
		}
	}

	/**
	 * @deprecated Use `EntityAssetManager.updateEntity` instead.
	 * @param {Entity} obj
	 * @param {import("./ContentWindowEntityEditor/ContentWindowEntityEditor.js").EntityChangedEventType} type
	 */
	notifyEntityEditors(obj, type) {
		if (!this.linkedEntityEditor) return;
		this.linkedEntityEditor.notifyEntityChanged(obj, type);
	}
}
