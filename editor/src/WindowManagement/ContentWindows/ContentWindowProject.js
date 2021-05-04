import ContentWindow from "./ContentWindow.js";
import TreeView from "../../UI/TreeView.js";
import editor from "../../editorInstance.js";
import Button from "../../UI/Button.js";
import SelectionManager from "../../Managers/SelectionManager.js";
import {handleDuplicateName} from "../../Util/Util.js";

export default class ContentWindowProject extends ContentWindow{
	constructor(){
		super();

		const createButton = new Button({
			text: "+",
			onClick: () => {
				const menu = editor.contextMenuManager.createContextMenu([
					{text: "New Folder", cb: () => {
						this.createNewDir();
					}},
					{text: "Materials", submenu: [
						{text: "New Material", cb: () => {
							this.createAsset("JJ:material");
						}},
						{text: "New Material Map", cb: () => {
							this.createAsset("JJ:materialMap");
						}},
						{text: "New WebGPU Pipeline Configuration", cb: () => {
							this.createAsset("JJ:webGpuPipelineConfiguration");
						}},
					]},
					{text: "New Mesh", cb: () => {
						this.createAsset("JJ:mesh");
					}},
					{text: "New Vertex State", cb: () => {
						this.createAsset("JJ:vertexState");
					}},
					{text: "New Entity", cb: () => {
						this.createAsset("JJ:entity");
					}},
					{text: "New Asset Bundle", cb: () => {
						this.createAsset("JJ:assetBundle");
					}},
				]);

				menu.setPos(createButton, "top left");
			}
		});
		this.addTopBarButton(createButton);

		const openProjectButton = new Button({
			text: "Open Project",
			onClick: () => {
				editor.projectManager.openProjectFromLocalDirectory();
			},
		});
		this.addTopBarButton(openProjectButton);

		const openRecentButton = new Button({
			text: "Open Recent",
			onClick: () => {
				editor.projectManager.openRecentProjectHandle();
			},
		});
		this.addTopBarButton(openRecentButton);

		this.treeView = new TreeView();
		this.treeView.renameable = true;
		this.treeView.rowVisible = false;
		this.treeView.draggable = true;
		this.treeView.addEventListener("selectionchange", this.onTreeViewSelectionChange.bind(this));
		this.treeView.addEventListener("namechange", this.onTreeViewNameChange.bind(this));
		this.treeView.addEventListener("dragstart", this.onTreeViewDragStart.bind(this));
		this.treeView.addEventListener("drop", this.onTreeViewDrop.bind(this));
		this.treeView.addEventListener("dblclick", this.onTreeViewDblClick.bind(this));
		this.treeView.addEventListener("contextmenu", this.onTreeViewContextMenu.bind(this));

		this.contentEl.appendChild(this.treeView.el);

		this.selectionManager = new SelectionManager();

		if(this.fileSystem){
			this.updateTreeView();
		}

		this.boundExternalChange = this.externalChange.bind(this);
		editor.projectManager.onExternalChange(this.boundExternalChange);
	}

	destructor(){
		super.destructor();

		this.treeView.destructor();
		this.treeView = null;

		this.selectionManager.destructor();
		this.selectionManager = null;

		editor.projectManager.removeOnExternalChange(this.boundExternalChange);
		this.boundExternalChange = null;
	}

	static get windowName(){
		return "project";
	}

	get fileSystem(){
		return editor.projectManager.currentProjectFileSystem;
	}

	async updateTreeView(startUpdatePath = null){
		let treeView = this.treeView;
		let path = [];
		if(startUpdatePath){
			treeView = this.treeView.findChildFromNamesPath(startUpdatePath);
			path = startUpdatePath;
		}
		await this.updateTreeViewRecursive(treeView, path);
	}

	async updateTreeViewRecursive(treeView, path){
		let fileTree = await this.fileSystem.readDir(path);
		for(const dir of fileTree.directories){
			if(!treeView.includes(dir)){
				let newTreeView = treeView.addChild();
				newTreeView.alwaysShowArrow = true;
				newTreeView.onArrowClick(() => {
					if(!newTreeView.collapsed){
						let newPath = [...path, dir];
						this.updateTreeViewRecursive(newTreeView, newPath);
					}
				});
				newTreeView.name = dir;
				newTreeView.collapsed = true;
			}
		}
		for(const file of fileTree.files){
			if(!treeView.includes(file)){
				let newTreeView = treeView.addChild();
				newTreeView.name = file;
			}
		}
		for(const child of [...treeView.children]){
			if(!fileTree.directories.includes(child.name) && !fileTree.files.includes(child.name)){
				treeView.removeChild(child);
			}else if(child.alwaysShowArrow && child.expanded){
				const newPath = [...path, child.name];
				this.updateTreeViewRecursive(child, newPath);
			}
		}
	}

	async externalChange(e){
		//todo: update treeview
	}

	async getProjectAssetByTreeViewItem(treeView){
		const path = this.pathFromTreeView(treeView);
		const projectAsset = await editor.projectManager.assetManager.getProjectAssetFromPath(path);
		return projectAsset;
	}

	async mapTreeViewArrayToProjectAssets(treeViews){
		const newArr = [];
		for(const treeView of treeViews){
			newArr.push(await this.getProjectAssetByTreeViewItem(treeView));
		}
		return newArr;
	}

	getSelectedParentPathForCreate(){
		let selectedPath = [];
		let treeView = this.treeView;
		for(const selectedItem of this.treeView.getSelectedItems()){
			if(!selectedItem.alwaysShowArrow && selectedItem.parent){
				treeView = selectedItem.parent;
			}else{
				treeView = selectedItem;
			}
			break;
		}
		const selectionPath = treeView.getNamesPath();
		selectedPath = selectionPath.slice(1, selectionPath.length);
		return selectedPath;
	}

	async createAsset(assetType){
		const selectedPath = this.getSelectedParentPathForCreate();
		await editor.projectManager.assetManager.createNewAsset(selectedPath, assetType);
		await this.updateTreeView(selectedPath);
	}

	async createNewDir(){
		const selectedPath = this.getSelectedParentPathForCreate();
		let folderName = "New Folder";
		if(this.fileSystem.exists([...selectedPath, folderName])){
			const existingFiles = await this.fileSystem.readDir(selectedPath);
			folderName = handleDuplicateName(existingFiles, folderName);
		}
		const newPath = [...selectedPath, folderName];
		await this.fileSystem.createDir(newPath);
		await this.updateTreeView(selectedPath);
		this.treeView.collapsed = false;
	}

	pathFromTreeView(treeView, removeLast = false){
		let path = treeView.getNamesPath();
		path.shift(); //remove root
		if(removeLast) path.pop();
		return path;
	}

	async onTreeViewSelectionChange(changes){
		changes.added = await this.mapTreeViewArrayToProjectAssets(changes.added);
		changes.removed = await this.mapTreeViewArrayToProjectAssets(changes.removed);
		this.selectionManager.changeSelection(changes);
	}

	async onTreeViewNameChange({changedElement, oldName, newName}){
		if(oldName == newName) return;
		const path = this.pathFromTreeView(changedElement);
		let oldPath = path.slice();
		let newPath = path.slice();
		oldPath.pop();
		newPath.pop();
		oldPath.push(oldName);
		newPath.push(newName);
		try{
			await this.fileSystem.move(oldPath, newPath);
		}catch(e){
			changedElement.name = oldName;
			throw e;
		}
		await editor.projectManager.assetManager.assetMoved(oldPath, newPath);
	}

	async onTreeViewDragStart({draggedElement, event}){
		const assetData = await this.getProjectAssetByTreeViewItem(draggedElement);
		event.dataTransfer.effectAllowed = "all";
		let assetTypeUuid = "";
		const assetType = editor.projectAssetTypeManager.getAssetType(assetData.assetType);
		if(assetType){
			assetTypeUuid = assetType.typeUuid;
		}
		event.dataTransfer.setData(`text/jj; dragtype=projectAsset; assettype=${assetTypeUuid}`, assetData.uuid);
	}

	async onTreeViewDrop({droppedOnElement, event}){
		const path = this.pathFromTreeView(droppedOnElement);
		for(const file of event.dataTransfer.files){
			let filePath = [...path, file.name];
			await this.fileSystem.writeFile(filePath, file);
		}
	}

	async onTreeViewDblClick({clickedElement}){
		const path = this.pathFromTreeView(clickedElement);
		const projectAsset = await editor.projectManager.assetManager.getProjectAssetFromPath(path);
		projectAsset.open();
	}

	onTreeViewContextMenu(e){
		const menu = e.showContextMenu();
		menu.createStructure([
			{text: "Copy asset UUID", cb: async () => {
				const path = this.pathFromTreeView(e.clickedElement);
				const uuid = await editor.projectManager.assetManager.getAssetUuidFromPath(path);
				await navigator.clipboard.writeText(uuid);
			}},
			{text: "Delete", cb: async () => {
				const path = this.pathFromTreeView(e.clickedElement);
				await editor.projectManager.assetManager.deleteAsset(path);
				const parentPath = path.slice(0, path.length - 1);
				await this.updateTreeView(parentPath);
			}},
		]);
	}
}
