import ContentWindow from "./ContentWindow.js";
import TreeView from "../../UI/TreeView.js";
import editor from "../../editorInstance.js";
import Button from "../../UI/Button.js";
import SelectionManager from "../../Managers/SelectionManager.js";
import {handleDuplicateName} from "../../Util/Util.js";

export default class ContentWindowProject extends ContentWindow{

	static contentWindowTypeId = "project";
	static contentWindowUiName = "Project Files";
	static contentWindowUiIcon = "icons/contentWindowTabs/project.svg";

	constructor(){
		super(...arguments);

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
						{text: "New WebGPU Pipeline Config", cb: () => {
							this.createAsset("JJ:webGpuPipelineConfig");
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
					{text: "New Render Output Config", cb: () => {
						this.createAsset("JJ:renderOutputConfig");
					}},
					{text: "New Render Clustered Lights Config", cb: () => {
						this.createAsset("JJ:clusteredLightsSetup");
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

	get fileSystem(){
		return editor.projectManager.currentProjectFileSystem;
	}

	/**
	 * Updates the path and its children recursively when expanded
	 * @param {Array<string> | null} path directory to update, updates the root TreeView when omitted
	 */
	async updateTreeView(path = null){
		let treeView = this.treeView;
		let updatePath = [];
		if(path){
			treeView = this.treeView.findChildFromNamesPath(path);
			updatePath = path;
		}
		await this.updateTreeViewRecursive(treeView, updatePath);
	}

	/**
	 * Updates a full range of directories from start to end, useful right before expanding a specific directory.
	 * @param {Array<string>} end The directory to update, this path is relative to start
	 * @param {?Array<string>} start The directory to start updating from, starts updating from the root when omitted.
	 * @param {boolean} collapsedOnly when this is true, expanded TreeViews won't be usdated.
	 */
	async updateTreeViewRange(end, start = null, collapsedOnly = true){
		let treeView = this.treeView;
		if(start){
			treeView = this.treeView.findChildFromNamesPath(startUpdatePath);
		}else{
			start = [];
		}
		for(let i=0; i<end.length; i++){
			const name = end[i];
			treeView = treeView.getChildByName(name);
			if(!collapsedOnly || treeView.collapsed){
				const path = end.slice(0, i + 1);
				if(!treeView.alwaysShowArrow) return; //if the TreeView is not a directory
				await this.updateTreeViewRecursive(treeView, [...start, ...path]);
			}
		}
	}

	/**
	 * Utility function for {@link ContentWindowProject.updateTreeView} that updates
	 * a TreeView and all expanded children recursively
	 * @param {TreeView} treeView the TreeView to update
	 * @param {Array<string>} path the path this TreeView belongs to
	 */
	async updateTreeViewRecursive(treeView, path){
		let fileTree = await this.fileSystem.readDir(path);
		for(const dir of fileTree.directories){
			if(!treeView.includes(dir)){
				let newTreeView = treeView.addChild();
				newTreeView.alwaysShowArrow = true;
				newTreeView.onCollapsedChange(() => {
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
			}else if(child.alwaysShowArrow && child.expanded){ //if the TreeView is a directory
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

	/**
	 * @param {import("../../UI/TreeView").default} treeView
	 * @param {boolean removeLast
	 * @returns {Array<string>}
	 */
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

	/**
	 * @param {import("../../UI/TreeView.js").TreeViewNameChangeEvent} e
	 */
	async onTreeViewNameChange(e){
		if(e.oldName == e.newName) return;
		const path = this.pathFromTreeView(e.target);
		let oldPath = path.slice();
		let newPath = path.slice();
		oldPath.pop();
		newPath.pop();
		oldPath.push(e.oldName);
		newPath.push(e.newName);
		try{
			await this.fileSystem.move(oldPath, newPath);
		}catch(err){
			e.target.name = e.oldName;
			throw err;
		}
		await editor.projectManager.assetManager.assetMoved(oldPath, newPath);
	}

	/**
	 * @param {import("../../UI/TreeView.js").TreeViewEvent} e
	 */
	async onTreeViewDragStart(e){
		const assetData = await this.getProjectAssetByTreeViewItem(e.target);
		e.rawEvent.dataTransfer.effectAllowed = "all";
		let assetTypeUuid = "";
		const assetType = editor.projectAssetTypeManager.getAssetType(assetData.assetType);
		if(assetType){
			assetTypeUuid = assetType.typeUuid;
		}
		e.rawEvent.dataTransfer.setData(`text/jj; dragtype=projectAsset; assettype=${assetTypeUuid}`, assetData.uuid);
	}

	/**
	 * @param {import("../../UI/TreeView.js").TreeViewEvent} e
	 */
	async onTreeViewDrop(e){
		const path = this.pathFromTreeView(e.target);
		for(const file of e.rawEvent.dataTransfer.files){
			let filePath = [...path, file.name];
			await this.fileSystem.writeFile(filePath, file);
		}
	}

	/**
	 * @param {import("../../UI/TreeView.js").TreeViewEvent} e
	 */
	async onTreeViewDblClick(e){
		const path = this.pathFromTreeView(e.target);
		const projectAsset = await editor.projectManager.assetManager.getProjectAssetFromPath(path);
		projectAsset.open();
	}

	/**
	 * @param {import("../../UI/TreeView.js").TreeViewContextMenuEvent} e
	 */
	onTreeViewContextMenu(e){
		const menu = e.showContextMenu();
		menu.createStructure([
			{text: "Copy asset UUID", onClick: async () => {
				const path = this.pathFromTreeView(e.target);
				const uuid = await editor.projectManager.assetManager.getAssetUuidFromPath(path);
				await navigator.clipboard.writeText(uuid);
			}},
			{text: "Delete", onClick: async () => {
				const path = this.pathFromTreeView(e.target);
				await editor.projectManager.assetManager.deleteAsset(path);
				const parentPath = path.slice(0, path.length - 1);
				await this.updateTreeView(parentPath);
			}},
		]);
	}

	async highlightPath(path){
		await this.updateTreeViewRange(path);
		const assetTreeView = this.treeView.findChildFromNamesPath(path);
		if(assetTreeView){
			assetTreeView.expandWithParents();
			assetTreeView.highlight();
		}
	}
}
