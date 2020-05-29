import ContentWindow from "./ContentWindow.js";
import TreeView from "../../UI/TreeView.js";
import editor from "../../editorInstance.js";
import Button from "../../UI/Button.js";
import ContentWindowEntityEditor from "./ContentWindowEntityEditor.js";

export default class ContentWindowProject extends ContentWindow{
	constructor(){
		super();

		let createButton = new Button({
			text: "+",
			onClick: _ => {
				let menu = editor.contextMenuManager.createContextMenu();
				menu.addItem("New Folder", _ => {
					this.createNewDir();
				});
				menu.addItem("New Material", _ => {
					this.createNewMaterial();
				});

				menu.setPos(createButton, "top left");
			}
		});
		this.addTopBarButton(createButton);

		this.treeView = new TreeView();
		this.treeView.renameable = true;
		this.treeView.rowVisible = false;
		this.treeView.draggable = true;
		this.treeView.addEventListener("namechange", this.onTreeViewNameChange.bind(this));
		this.treeView.addEventListener("dragstart", this.onTreeViewDragStart.bind(this));
		this.treeView.addEventListener("drop", this.onTreeViewDrop.bind(this));
		this.treeView.addEventListener("dblclick", this.onTreeViewDblClick.bind(this));

		this.contentEl.appendChild(this.treeView.el);

		let fileSystem = this.getFileSystem();
		if(fileSystem){
			this.updateTreeView(this.treeView, fileSystem);
		}
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
			let newTreeView = treeView.addChild();
			newTreeView.name = file;
		}
	}

	async createAtSelectedPath(createName = "new", createFn = null){
		let selectedPath = [];
		let treeView = this.treeView;
		for(const selectedItem of this.treeView.getSelectedItems()){
			let selectionPath = selectedItem.getNamesPath();
			selectedPath = selectionPath.slice(1, selectionPath.length);
			treeView = selectedItem;
			break;
		}
		let newPath = [...selectedPath, createName];
		let fileSystem = this.getFileSystem();
		let returnData = null;
		if(createFn){
			returnData = await createFn(fileSystem, newPath, createName);
		}
		await this.updateTreeView(treeView, fileSystem, selectedPath);
		treeView.collapsed = false;
		return returnData;
	}

	async createNewDir(){
		await this.createAtSelectedPath("New Folder", async (fileSystem, newPath) => {
			await fileSystem.createDir(newPath);
		});
	}

	async createNewMaterial(){
		let newPath = await this.createAtSelectedPath("New Material.json", async(fileSystem, newPath, fileName) => {
			await fileSystem.writeJson(newPath, {assetType:"material"});
			return newPath;
		});

		await editor.projectManager.assetManager.registerAsset(newPath);
	}

	pathFromTreeView(treeView, removeLast = false){
		let path = treeView.getNamesPath();
		path.shift(); //remove root
		if(removeLast) path.pop();
		return path;
	}

	async onTreeViewNameChange({changedElement, oldName, newName}){
		const path = this.pathFromTreeView(changedElement);
		let oldPath = path.slice();
		let newPath = path.slice();
		oldPath.push(oldName);
		newPath.push(newName);
		let fileSystem = this.getFileSystem();
		await fileSystem.move(oldPath, newPath);
	}

	onTreeViewDragStart({draggedElement, event}){
		let path = this.pathFromTreeView(draggedElement);
		event.dataTransfer.effectAllowed = "all";
		event.dataTransfer.setData("text/jj; dragtype=projectAsset; assettype=material", JSON.stringify({path}));
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
		let fileSystem = this.getFileSystem();
		let json = await fileSystem.readJson(path);
		let type = json.type;
		if(type == "Entity"){
			let entity = editor.projectManager.assetManager.createEntityFromJsonData(json.entity);
			for(const entityEditor of editor.windowManager.getContentWindowsByType(ContentWindowEntityEditor)){
				entityEditor.editingEntity = entity;
			}
		}
	}
}
