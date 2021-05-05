import ContentWindow from "./ContentWindow.js";
import TreeView from "../../UI/TreeView.js";
import editor from "../../editorInstance.js";
import SelectionManager from "../../Managers/SelectionManager.js";

export default class ContentWindowBuiltInAssets extends ContentWindow{
	static get windowName(){
		return "builtInAssets";
	}

	constructor(){
		super();

		this.treeViewAssets = new Map();

		this.treeView = new TreeView();
		this.treeView.rowVisible = false;
		this.treeView.draggable = true;
		// this.treeView.addEventListener("selectionchange", this.onTreeViewSelectionChange.bind(this));
		// this.treeView.addEventListener("namechange", this.onTreeViewNameChange.bind(this));
		this.treeView.addEventListener("dragstart", this.onTreeViewDragStart.bind(this));
		// this.treeView.addEventListener("drop", this.onTreeViewDrop.bind(this));
		// this.treeView.addEventListener("dblclick", this.onTreeViewDblClick.bind(this));
		this.treeView.addEventListener("contextmenu", this.onTreeViewContextMenu.bind(this));

		this.contentEl.appendChild(this.treeView.el);

		this.selectionManager = new SelectionManager();

		this.init();
	}

	async init(){
		await editor.builtInAssetManager.waitForLoad();
		this.updateTreeView();
	}

	destructor(){
		super.destructor();

		this.treeView.destructor();
		this.treeView = null;

		this.selectionManager.destructor();
		this.selectionManager = null;
	}

	updateTreeView(){
		for(const asset of editor.builtInAssetManager.assets.values()){
			this.addAssetToTreeView(asset, asset.path, this.treeView);
		}
	}

	addAssetToTreeView(asset, path, treeView){
		const [name, ...restPath] = path;
		let child = treeView.getChildByName(name);
		if(!child){
			child = treeView.addChild();
			child.name = path[0];
		}
		if(path.length > 1){
			this.addAssetToTreeView(asset, restPath, child);
		}else{
			this.treeViewAssets.set(child, asset);
		}
	}

	onTreeViewDragStart({draggedElement, event}){
		const projectAsset = this.treeViewAssets.get(draggedElement);
		event.dataTransfer.effectAllowed = "all";
		let assetTypeUuid = "";
		const assetType = editor.projectAssetTypeManager.getAssetType(projectAsset.assetType);
		if(assetType){
			assetTypeUuid = assetType.typeUuid;
		}
		event.dataTransfer.setData(`text/jj; dragtype=projectAsset; assettype=${assetTypeUuid}`, projectAsset.uuid);
	}

	onTreeViewContextMenu(e){
		const menu = e.showContextMenu();
		menu.createStructure([
			{text: "Copy asset UUID", cb: async () => {
				const projectAsset = this.treeViewAssets.get(e.clickedElement);
				await navigator.clipboard.writeText(projectAsset.uuid);
			}},
		]);
	}
}
