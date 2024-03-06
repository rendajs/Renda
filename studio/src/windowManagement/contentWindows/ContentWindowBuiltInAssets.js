import { ContentWindow } from "./ContentWindow.js";
import { TreeView } from "../../ui/TreeView.js";

export class ContentWindowBuiltInAssets extends ContentWindow {
	static contentWindowTypeId = /** @type {const} */ ("renda:builtInAssets");
	static contentWindowUiName = "Built-in Assets";
	static contentWindowUiIcon = "static/icons/contentWindowTabs/builtInAssets.svg";

	/**
	 * @param {ConstructorParameters<typeof ContentWindow>} args
	 */
	constructor(...args) {
		super(...args);

		/** @type {Map<TreeView, import("../../assets/ProjectAsset.js").ProjectAssetAny>} */
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

		/** @type {import("../../misc/SelectionGroup.js").SelectionGroup<import("../../assets/ProjectAsset.js").ProjectAssetAny>} */
		this.selectionGroup = this.studioInstance.selectionManager.createSelectionGroup();

		this.init();
	}

	async init() {
		await this.studioInstance.builtInAssetManager.waitForLoad();
		this.updateTreeView();
	}

	destructor() {
		super.destructor();

		this.treeView.destructor();
		this.selectionGroup.destructor();
	}

	updateTreeView() {
		if (this.destructed) return;
		for (const asset of this.studioInstance.builtInAssetManager.assets.values()) {
			this.addAssetToTreeView(asset, asset.path, this.treeView);
		}
	}

	/**
	 * @param {import("../../assets/ProjectAsset.js").ProjectAssetAny} asset
	 * @param {string[]} path
	 * @param {TreeView} treeView
	 */
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
	 * @param {import("../../ui/TreeView.js").TreeViewDragEvent} e
	 */
	async onTreeViewDragStart(e) {
		const projectAsset = this.treeViewAssets.get(e.target);
		if (!projectAsset) return;

		let assetType = null;
		if (projectAsset.assetType) assetType = this.studioInstance.projectAssetTypeManager.getAssetType(projectAsset.assetType);

		/** @type {import("./ContentWindowProject.js").DraggingProjectAssetData} */
		const draggingData = {
			dataPopulated: true,
			assetType,
			assetUuid: projectAsset.uuid,
		};
		const draggingDataUuid = this.studioInstance.dragManager.registerDraggingData(draggingData);
		if (e.rawEvent.dataTransfer) {
			e.rawEvent.dataTransfer.setData(`text/renda; dragtype=projectasset; draggingdata=${draggingDataUuid}`, "");
			e.rawEvent.dataTransfer.effectAllowed = "all";
		}
	}

	/**
	 * @param {import("../../ui/TreeView.js").TreeViewContextMenuEvent} e
	 */
	async onTreeViewContextMenu(e) {
		const menu = await e.showContextMenu();
		menu.createStructure([
			{
				text: "Copy Asset UUID",
				onClick: async () => {
					const projectAsset = this.treeViewAssets.get(e.target);
					if (!projectAsset) {
						throw new Error("Asset does not exist.");
					}
					await navigator.clipboard.writeText(projectAsset.uuid);
				},
			},
		]);
	}

	/**
	 * @param {import("../../ui/TreeView.js").TreeViewSelectionChangeEvent} treeViewChanges
	 */
	onTreeViewSelectionChange(treeViewChanges) {
		/** @type {import("../../misc/SelectionGroup.js").SelectionGroupChangeData<import("../../assets/ProjectAsset.js").ProjectAssetAny>} */
		const changes = {};
		changes.reset = treeViewChanges.reset;
		changes.added = this.mapTreeViewArrayToProjectAssets(treeViewChanges.added);
		changes.removed = this.mapTreeViewArrayToProjectAssets(treeViewChanges.removed);
		this.selectionGroup.changeSelection(changes);
	}

	/** @override */
	activate() {
		if (this.treeView.children.length > 0) {
			this.treeView.children[0].focusIfNotFocused();
		}
		this.selectionGroup.activate();
	}

	/**
	 * @param {Iterable<TreeView>} treeViews
	 */
	mapTreeViewArrayToProjectAssets(treeViews) {
		const newArr = [];
		for (const treeView of treeViews) {
			const asset = this.treeViewAssets.get(treeView);
			if (!asset) continue;
			newArr.push(asset);
		}
		return newArr;
	}

	/**
	 * @param {string[]} path
	 */
	highlightPath(path) {
		const assetTreeView = this.treeView.findChildFromNamesPath(path);
		if (assetTreeView) {
			assetTreeView.expandWithParents();
			assetTreeView.highlight();
		}
	}
}
