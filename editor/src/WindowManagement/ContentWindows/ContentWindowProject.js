import ContentWindow from "./ContentWindow.js";
import TreeView from "../../UI/TreeView.js";
import editor from "../../editorInstance.js";
import Button from "../../UI/Button.js";
import SelectionManager from "../../Managers/SelectionManager.js";

export default class ContentWindowProject extends ContentWindow{
	constructor(){
		super();

		const createButton = new Button({
			text: "+",
			onClick: _ => {
				const menu = editor.contextMenuManager.createContextMenu();
				menu.addItem("New Folder", _ => {
					this.createNewDir();
				});
				menu.addItem("New Material", _ => {
					this.createAsset("JJ:material");
				});
				menu.addItem("New Material Map", _ => {
					this.createAsset("JJ:materialMap");
				});
				menu.addItem("New WebGPU Pipeline Configuration", _ => {
					this.createAsset("JJ:webGpuPipelineConfiguration");
				});
				menu.addItem("New Mesh", _ => {
					this.createAsset("JJ:mesh");
				});
				menu.addItem("New Vertex State", _ => {
					this.createAsset("JJ:vertexState");
				});
				menu.addItem("New Entity", _ => {
					this.createAsset("JJ:entity");
				});
				menu.addItem("New Asset Bundle", _ => {
					this.createAsset("JJ:assetBundle");
				});

				menu.setPos(createButton, "top left");
			}
		});
		this.addTopBarButton(createButton);

		const openProjectButton = new Button({
			text: "Open Project",
			onClick: _ => {
				editor.projectManager.openProjectFromLocalDirectory();
			},
		});
		this.addTopBarButton(openProjectButton);

		const openRecentButton = new Button({
			text: "Open Recent",
			onClick: _ => {
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

		let fileSystem = this.getFileSystem();
		if(fileSystem){
			this.updateTreeView(this.treeView, fileSystem);
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

	getFileSystem(){
		return editor.projectManager.currentProjectFileSystem;
	}

	async updateTreeView(treeView, fileSystem, path = []){
		let fileTree = await fileSystem.readDir(path);
		for(const dir of fileTree.directories){
			if(!treeView.includes(dir)){
				let newTreeView = treeView.addChild();
				newTreeView.alwaysShowArrow = true;
				newTreeView.onArrowClick(_ => {
					if(!newTreeView.collapsed){
						let newPath = [...path, dir];
						this.updateTreeView(newTreeView, fileSystem, newPath);
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

	getFirstSelectedPath(){
		let selectedPath = [];
		let treeView = this.treeView;
		for(const selectedItem of this.treeView.getSelectedItems()){
			let selectionPath = selectedItem.getNamesPath();
			selectedPath = selectionPath.slice(1, selectionPath.length);
			treeView = selectedItem;
			break;
		}
		return selectedPath;
	}

	async createAsset(assetType){
		const selectedPath = this.getFirstSelectedPath();
		await editor.projectManager.assetManager.createNewAsset(selectedPath, assetType);
		await this.updateTreeView(this.treeView, this.getFileSystem(), selectedPath);
	}

	async createNewDir(){
		const selectedPath = this.getFirstSelectedPath();
		let newPath = [...selectedPath, "New Folder"];
		let fileSystem = this.getFileSystem();
		await fileSystem.createDir(newPath);
		await this.updateTreeView(this.treeView, fileSystem, selectedPath);
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
		let fileSystem = this.getFileSystem();
		try{
			await fileSystem.move(oldPath, newPath);
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
			let fileSystem = this.getFileSystem();
			await fileSystem.writeFile(filePath, file);
		}
	}

	async onTreeViewDblClick({clickedElement}){
		const path = this.pathFromTreeView(clickedElement);
		const projectAsset = await editor.projectManager.assetManager.getProjectAssetFromPath(path);
		projectAsset.open();
	}

	onTreeViewContextMenu(e){
		const menu = e.showContextMenu();
		menu.addItem("hello");
	}
}
