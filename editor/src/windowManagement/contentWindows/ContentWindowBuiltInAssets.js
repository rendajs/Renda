import {ContentWindow} from "./ContentWindow.js";
import {TreeView} from "../../UI/TreeView.js";
import {SelectionGroup} from "../../Managers/SelectionGroup.js";

export class ContentWindowBuiltInAssets extends ContentWindow {
	static contentWindowTypeId = "builtInAssets";
	static contentWindowUiName = "Built-in Assets";
	static contentWindowUiIcon = "icons/contentWindowTabs/builtInAssets.svg";

	/**
	 * @param {ConstructorParameters<typeof ContentWindow>} args
	 */
	constructor(...args) {
		super(...args);

		this.treeViewAssets = new Map();

		this.treeView = new TreeView();
		this.treeView.rowVisible = false;
		this.treeView.draggable = true;
		this.treeView.addEventListener("selectionchange", this.onTreeViewSelectionChange.bind(this));
		// this.treeView.addEventListener("namechange", this.onTreeViewNameChange.bind(this));
		this.treeView.addEventListener("dragstart", this.onTreeViewDragStart.bind(this));
		// this.treeView.addEventListener("drop", this.onTreeViewDrop.bind(this));
		// this.treeView.addEventListener("dblclick", this.onTreeViewDblClick.bind(this));
		this.treeView.addEventListener("contextmenu", this.onTreeViewContextMenu.bind(this));

		this.contentEl.appendChild(this.treeView.el);

		/** @type {SelectionGroup<import("../../assets/ProjectAsset.js").ProjectAsset>} */
		this.selectionManager = this.editorInstance.selectionManager.createSelectionGroup();

		this.init();
	}

	async init() {
		await this.editorInstance.builtInAssetManager.waitForLoad();
		this.updateTreeView();
	}

	destructor() {
		super.destructor();

		this.treeView.destructor();
		this.treeView = null;

		this.selectionManager.destructor();
		this.selectionManager = null;
	}

	updateTreeView() {
		if (this.destructed) return;
		for (const asset of this.editorInstance.builtInAssetManager.assets.values()) {
			this.addAssetToTreeView(asset, asset.path, this.treeView);
		}
	}

	addAssetToTreeView(asset, path, treeView) {
		const [name, ...restPath] = path;
		let child = treeView.getChildByName(name);
		if (!child) {
			child = treeView.addChild();
			child.name = path[0];
			child.collapsed = true;
		}
		if (path.length > 1) {
			this.addAssetToTreeView(asset, restPath, child);
		} else {
			this.treeViewAssets.set(child, asset);
		}
	}

	/**
	 * @param {import("../../UI/TreeView.js").TreeViewDragEvent} e
	 */
	async onTreeViewDragStart(e) {
		const projectAsset = this.treeViewAssets.get(e.target);

		/** @type {import("./ContentWindowProject.js").DraggingProjectAssetData} */
		const draggingData = {
			dataPopulated: true,
			assetType: this.editorInstance.projectAssetTypeManager.getAssetType(projectAsset.assetType),
			assetUuid: projectAsset.uuid,
		};
		const draggingDataUuid = this.editorInstance.dragManager.registerDraggingData(draggingData);
		e.rawEvent.dataTransfer.setData(`text/jj; dragtype=projectasset; draggingdata=${draggingDataUuid}`, "");
		e.rawEvent.dataTransfer.effectAllowed = "all";
	}

	/**
	 * @param {import("../../UI/TreeView.js").TreeViewContextMenuEvent} e
	 */
	onTreeViewContextMenu(e) {
		const menu = e.showContextMenu();
		menu.createStructure([
			{
				text: "Copy asset UUID",
				onClick: async () => {
					const projectAsset = this.treeViewAssets.get(e.target);
					await navigator.clipboard.writeText(projectAsset.uuid);
				},
			},
		]);
	}

	/**
	 * @param {import("../../UI/TreeView.js").TreeViewSelectionChangeEvent} treeViewChanges
	 */
	onTreeViewSelectionChange(treeViewChanges) {
		/** @type {import("../../Managers/SelectionGroup.js").SelectionGroupChangeData<import("../../assets/ProjectAsset.js").ProjectAsset>} */
		const changes = {};
		changes.reset = treeViewChanges.reset;
		changes.added = this.mapTreeViewArrayToProjectAssets(treeViewChanges.added);
		changes.removed = this.mapTreeViewArrayToProjectAssets(treeViewChanges.removed);
		this.selectionManager.changeSelection(changes);
	}

	/**
	 * @param {Iterable<TreeView>} treeViews
	 */
	mapTreeViewArrayToProjectAssets(treeViews) {
		const newArr = [];
		for (const treeView of treeViews) {
			newArr.push(this.treeViewAssets.get(treeView));
		}
		return newArr;
	}

	highlightPath(path) {
		const assetTreeView = this.treeView.findChildFromNamesPath(path);
		assetTreeView.expandWithParents();
		assetTreeView.highlight();
	}
}
