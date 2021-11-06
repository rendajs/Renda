import ContentWindow from "./ContentWindow.js";
import TreeView from "../../UI/TreeView.js";
import Button from "../../UI/Button.js";
import {Entity} from "../../../../src/index.js";
import {ContentWindowEntityEditor} from "./ContentWindowEntityEditor.js";
import editor from "../../editorInstance.js";
import ProjectAssetTypeEntity from "../../Assets/ProjectAssetType/ProjectAssetTypeEntity.js";
import {parseMimeType} from "../../Util/Util.js";
import {EntitySelection} from "../../Misc/EntitySelection.js";
import DropDownGui from "../../UI/DropDownGui.js";

export class ContentWindowOutliner extends ContentWindow {
	static contentWindowTypeId = "outliner";
	static contentWindowUiName = "Outliner";
	static contentWindowUiIcon = "icons/contentWindowTabs/outliner.svg";

	constructor() {
		super();

		this.treeView = new TreeView();
		this.treeView.rearrangeableHierarchy = true;
		this.treeView.rearrangeableOrder = true;
		this.treeView.renameable = true;
		this.contentEl.appendChild(this.treeView.el);
		this.treeView.addEventListener("selectionchange", this.onTreeViewSelectionChange.bind(this));
		this.treeView.addEventListener("namechange", this.onTreeViewNameChange.bind(this));
		this.treeView.addEventListener("contextmenu", this.onTreeViewContextMenu.bind(this));
		this.treeView.addEventListener("validatedrag", this.onTreeViewValidatedrag.bind(this));
		this.treeView.addEventListener("rearrange", this.onTreeViewRearrange.bind(this));
		this.treeView.addEventListener("drop", this.onTreeViewDrop.bind(this));

		/** @type {ContentWindowEntityEditor} */
		this.linkedEntityEditor = null;

		const createEmptyButton = new Button({
			text: "+",
			onClick: () => {
				this.createNewEmpty();
			},
		});
		this.addTopBarEl(createEmptyButton.el);

		this.availableEntityEditorUuids = [];
		this.selectEntityEditorDropDown = new DropDownGui();
		this.selectEntityEditorDropDown.onValueChange(() => {
			const index = this.selectEntityEditorDropDown.getValue({getAsString: false});
			const uuid = this.availableEntityEditorUuids[index];
			const entityEditor = /** @type {ContentWindowEntityEditor} */ (editor.windowManager.getContentWindowByUuid(uuid));
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
		this.treeView = null;
		this.linkedEntityEditor = null;
	}

	get selectionManager() {
		return this.linkedEntityEditor.selectionManager;
	}

	entityEditorUpdated() {
		this.updateAvailableEntityEditorsList();
		if (!this.linkedEntityEditor) {
			this.setAvailableLinkedEntityEditor();
		}
	}

	updateAvailableEntityEditorsList() {
		this.availableEntityEditorUuids = [];
		const dropDownItems = [];
		for (const entityEditor of editor.windowManager.getContentWindowsByConstructor(ContentWindowEntityEditor)) {
			this.availableEntityEditorUuids.push(entityEditor.uuid);

			let entityAssetName = null;
			if (entityEditor.editingEntityUuid) {
				const editingEntityAsset = editor.projectManager.assetManager.getProjectAssetImmediate(entityEditor.editingEntityUuid);
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
			this.selectEntityEditorDropDownContainer.appendChild(this.selectEntityEditorDropDown.el);
		} else if (this.selectEntityEditorDropDownContainer.hasChildNodes()) {
			this.selectEntityEditorDropDownContainer.removeChild(this.selectEntityEditorDropDown.el);
		}
	}

	setAvailableLinkedEntityEditor() {
		const entityEditor = editor.windowManager.getMostSuitableContentWindowByConstructor(ContentWindowEntityEditor, false);
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
		this.updateTreeView();
	}

	updateTreeView() {
		let treeData = {};
		if (this.linkedEntityEditor && this.linkedEntityEditor.editingEntity) {
			treeData = this.treeDataFromEntity(this.linkedEntityEditor.editingEntity);
		}
		this.treeView.updateData(treeData);
	}

	treeDataFromEntity(entity) {
		const treeData = {};
		treeData.name = entity.name;
		treeData.children = [];
		for (const child of entity.getChildren()) {
			treeData.children.push(this.treeDataFromEntity(child));
		}
		return treeData;
	}

	createNewEmpty() {
		this.createNew("Entity");
	}

	createNew(name, afterCreate = null) {
		if (!this.linkedEntityEditor || !this.linkedEntityEditor.editingEntity) return;
		const rootEnt = this.linkedEntityEditor.editingEntity;
		let createdAny = false;
		// todo: use selection manager
		for (const indicesPath of this.treeView.getSelectionIndices()) {
			const ent = rootEnt.getEntityByIndicesPath(indicesPath);
			const createdEnt = new Entity(name);
			ent.add(createdEnt);
			createdAny = true;
		}
		if (!createdAny) {
			const createdEnt = new Entity(name);
			rootEnt.add(createdEnt);
		}
		this.updateTreeView();
	}

	/**
	 * @param {TreeView} treeView
	 * @returns {Entity}
	 */
	getEntityByTreeViewItem(treeView) {
		const indicesPath = treeView.getIndicesPath();
		return this.getEntityByIndicesPath(indicesPath);
	}

	/**
	 * @param {number[]} indicesPath
	 * @returns {Entity}
	 */
	getEntityByIndicesPath(indicesPath) {
		if (!this.linkedEntityEditor || !this.linkedEntityEditor.editingEntity) return null;
		return this.linkedEntityEditor.editingEntity.getEntityByIndicesPath(indicesPath);
	}

	/**
	 * @param {import("../../UI/TreeView.js").TreeViewSelectionChangeEvent} e
	 */
	onTreeViewSelectionChange(e) {
		if (!this.linkedEntityEditor) return;
		/** @type {import("../../Managers/SelectionManager.js").SelectionManagerSelectionChangeData<EntitySelection>} */
		const changeData = {
			added: this.mapSelectionChangeData(e.added),
			removed: this.mapSelectionChangeData(e.removed),
			reset: e.reset,
		};
		this.selectionManager.changeSelection(changeData);
	}

	/**
	 * @param {TreeView[]} treeViews
	 */
	mapSelectionChangeData(treeViews) {
		return treeViews.map(treeView => {
			const entity = this.getEntityByTreeViewItem(treeView);
			return new EntitySelection(entity, {
				outlinerTreeView: treeView,
				outliner: this,
			});
		});
	}

	/**
	 * @param {import("../../UI/TreeView.js").TreeViewNameChangeEvent} e
	 */
	onTreeViewNameChange(e) {
		const ent = this.getEntityByTreeViewItem(e.target);
		ent.name = e.target.name;
	}

	/**
	 * @param {import("../../UI/TreeView.js").TreeViewContextMenuEvent} e
	 */
	onTreeViewContextMenu(e) {
		const menu = e.showContextMenu();
		menu.createStructure([
			{
				text: "Delete",
				onClick: () => {
					const parentTreeView = e.target.parent;
					const parentEntity = this.getEntityByTreeViewItem(parentTreeView);
					const index = e.target.index;
					parentEntity.removeAtIndex(index);
					this.updateTreeView();
					const entity = this.getEntityByTreeViewItem(e.target);
					this.notifyEntityEditors(entity, "delete");
				},
			},
		]);
	}

	/**
	 * @param {import("../../UI/TreeView.js").TreeViewValidateDragEvent} e
	 */
	onTreeViewValidatedrag(e) {
		if (!e.isSameTreeView && this.validateDragMimeType(e.mimeType)) {
			e.accept();
		}
	}

	/**
	 * @param {import("../../Util/Util.js").ParsedMimeType} mimeType
	 * @returns {import("./ContentWindowProject.js").DraggingProjectAssetData | null}
	 */
	validateDragMimeType(mimeType) {
		if (mimeType.type == "text" &&
			mimeType.subType == "jj" &&
			mimeType.parameters.dragtype == "projectasset"
		) {
			/** @type {import("./ContentWindowProject.js").DraggingProjectAssetData} */
			const dragData = editor.dragManager.getDraggingData(mimeType.parameters.draggingdata);
			if (dragData.assetType == ProjectAssetTypeEntity) {
				return dragData;
			}
		}
		return null;
	}

	/**
	 * @param {import("../../UI/TreeView.js").TreeViewRearrangeEvent} e
	 */
	onTreeViewRearrange(e) {
		for (const movedItem of e.movedItems) {
			const entity = this.getEntityByIndicesPath(movedItem.oldIndicesPath);
			const oldParent = this.getEntityByIndicesPath(movedItem.oldIndicesPath.slice(0, -1));
			const parentIndicesPath = movedItem.newIndicesPath.slice(0, -1);
			const insertIndex = movedItem.newIndicesPath.at(-1);
			const newParent = this.getEntityByIndicesPath(parentIndicesPath);
			oldParent.remove(entity); // todo: remove at index
			newParent.addAtIndex(entity, insertIndex);
		}
	}

	/**
	 * @param {import("../../UI/TreeView.js").TreeViewDragEvent} e
	 */
	async onTreeViewDrop(e) {
		const parent = this.getEntityByTreeViewItem(e.target);
		for (const item of e.rawEvent.dataTransfer.items) {
			const mimeType = parseMimeType(item.type);
			const dragData = this.validateDragMimeType(mimeType);
			if (dragData) {
				const entityAssetUuid = dragData.assetUuid;
				const entityAsset = await editor.projectManager.assetManager.getLiveAsset(entityAssetUuid);
				parent.add(entityAsset);
			}
		}
		this.updateTreeView();
	}

	notifyEntityEditors(obj, type) {
		if (!this.linkedEntityEditor) return;
		this.linkedEntityEditor.notifyEntityChanged(obj, type);
	}
}
