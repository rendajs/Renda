import ContentWindow from "./ContentWindow.js";
import TreeView from "../../UI/TreeView.js";
import editor from "../../editorInstance.js";
import SelectionManager from "../../Managers/SelectionManager.js";

export default class ContentWindowBuiltInAssets extends ContentWindow {
	static contentWindowTypeId = "builtInAssets";
	static contentWindowUiName = "Built-in Assets";
	static contentWindowUiIcon = "icons/contentWindowTabs/builtInAssets.svg";

	constructor() {
		super(...arguments);

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

		this.selectionManager = new SelectionManager();

		this.init();
	}

	async init() {
		await editor.builtInAssetManager.waitForLoad();
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
		for (const asset of editor.builtInAssetManager.assets.values()) {
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
	onTreeViewDragStart(e) {
		const projectAsset = this.treeViewAssets.get(e.target);
		e.rawEvent.dataTransfer.effectAllowed = "all";
		let assetTypeUuid = "";
		const assetType = editor.projectAssetTypeManager.getAssetType(projectAsset.assetType);
		if (assetType) {
			assetTypeUuid = assetType.typeUuid;
		}
		e.rawEvent.dataTransfer.setData(`text/jj; dragtype=projectAsset; assettype=${assetTypeUuid}`, projectAsset.uuid);
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

	onTreeViewSelectionChange(changes) {
		changes.added = this.mapTreeViewArrayToProjectAssets(changes.added);
		changes.removed = this.mapTreeViewArrayToProjectAssets(changes.removed);
		this.selectionManager.changeSelection(changes);
	}

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
