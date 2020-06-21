import ContentWindow from "./ContentWindow.js";
import TreeView from "../../UI/TreeView.js";
import editor from "../../editorInstance.js";
import Button from "../../UI/Button.js";
import ContentWindowEntityEditor from "./ContentWindowEntityEditor.js";
import {Mesh, Vector3, Entity} from "../../../../src/index.js";

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
					this.createNewMaterial();
				});
				menu.addItem("New Mesh", _ => {
					this.createNewMesh();
				});
				menu.addItem("New Entity", _ => {
					this.createNewEntity();
				});

				menu.setPos(createButton, "top left");
			}
		});
		this.addTopBarButton(createButton);

		const loadAssetSettingsButton = new Button({
			text: "Load Asset Settings",
			onClick: _ => {
				editor.projectManager.assetManager.loadAssetSettings()
			},
		});
		this.addTopBarButton(loadAssetSettingsButton);

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
			if(!treeView.includes(file)){
				let newTreeView = treeView.addChild();
				newTreeView.name = file;
			}
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
			await fileSystem.writeJson(newPath, {assetType: "material"});
			return newPath;
		});

		await editor.projectManager.assetManager.registerAsset(newPath, "material");
	}

	async createNewMesh(){
		let newPath = await this.createAtSelectedPath("New Mesh.jjmesh", async(fileSystem, newPath, fileName) => {
			const cubeMesh = new Mesh();
			cubeMesh.setBuffer(Mesh.AttributeTypes.INDEX, [0,1,2, 1,2,3,  4,5,6, 5,6,7,  8,9,10, 9,10,11,  12,13,14, 13,14,15,  16,17,18, 17,18,19,  20,21,22, 21,22,23]);
			cubeMesh.setBuffer(Mesh.AttributeTypes.POSITION, [
				new Vector3(-1,-1,-1),
				new Vector3(-1,-1, 1),
				new Vector3(-1, 1,-1),
				new Vector3(-1, 1, 1),

				new Vector3( 1,-1,-1),
				new Vector3( 1,-1, 1),
				new Vector3( 1, 1,-1),
				new Vector3( 1, 1, 1),

				new Vector3(-1,-1,-1),
				new Vector3(-1,-1, 1),
				new Vector3( 1,-1,-1),
				new Vector3( 1,-1, 1),

				new Vector3(-1, 1,-1),
				new Vector3(-1, 1, 1),
				new Vector3( 1, 1,-1),
				new Vector3( 1, 1, 1),

				new Vector3(-1,-1,-1),
				new Vector3(-1, 1,-1),
				new Vector3( 1,-1,-1),
				new Vector3( 1, 1,-1),

				new Vector3(-1,-1, 1),
				new Vector3(-1, 1, 1),
				new Vector3( 1,-1, 1),
				new Vector3( 1, 1, 1),
			]);
			const blob = cubeMesh.toBlob();
			const file = new File([blob], fileName);
			await fileSystem.writeFile(newPath, file);
			return newPath;
		});

		await editor.projectManager.assetManager.registerAsset(newPath, "mesh");
	}

	async createNewEntity(){
		let newPath = await this.createAtSelectedPath("New Entity.json", async(fileSystem, newPath, fileName) => {
			const entity = new Entity("New Entity");
			await fileSystem.writeJson(newPath, {
				assetType: "entity",
				asset: entity.toJson(),
			});
			return newPath;
		});

		await editor.projectManager.assetManager.registerAsset(newPath, "entity");
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
		const assetData = editor.projectManager.assetManager.getAssetData(path);
		event.dataTransfer.setData(`text/jj; dragtype=projectAsset; assettype=${assetData.assetType}`, assetData.uuid);
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
		if(await fileSystem.isFile(path)){
			let json = await fileSystem.readJson(path);
			let assetType = json.assetType;
			if(assetType == "entity"){
				let entity = editor.projectManager.assetManager.createEntityFromJsonData(json.asset);
				const entityUuid = editor.projectManager.assetManager.getAssetUuid(path);
				for(const entityEditor of editor.windowManager.getContentWindowsByType(ContentWindowEntityEditor)){
					entityEditor.loadEntityAsset(entity, entityUuid);
				}
			}
		}
	}
}
