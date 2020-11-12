import ContentWindow from "./ContentWindow.js";
import ContentWindowOutliner from "./ContentWindowOutliner.js";
import Button from "../../UI/Button.js";
import {Entity, Mesh, Vec3, Material, ComponentTypes} from "../../../../src/index.js";
import editor from "../../editorInstance.js";
import SelectionManager from "../../Managers/SelectionManager.js";
import OrbitControls from "../../Util/OrbitControls.js";

export default class ContentWindowEntityEditor extends ContentWindow{
	constructor(){
		super();

		this.setContentBehindTopBar(true);

		let saveEntityButton = new Button({
			text: "Save",
			onClick: _ => {
				this.saveEntityAsset();
			}
		});
		this.addTopBarButton(saveEntityButton);

		this.canvasEl = document.createElement("canvas");
		this.ctx = this.canvasEl.getContext("bitmaprenderer");
		this.contentEl.appendChild(this.canvasEl);

		this.renderDirty = false;

		this.editorScene = new Entity({name: "editorScene"});
		this.editorCamera = new Entity({name: "editorCamera"});
		this.editorScene.add(this.editorCamera);
		this.editorCamComponent = this.editorCamera.addComponent(ComponentTypes.camera);

		this.orbitControls = new OrbitControls(this.editorCamera, this.canvasEl);

		this.editingEntityUuid = null;
		this._editingEntity = null;
		this.selectionManager = new SelectionManager();

		this.createdLiveAssetChangeListeners = new Set();

		this.newEmptyEditingEntity();
	}

	static get windowName(){
		return "entityEditor";
	}

	destructor(){
		super.destructor();

		this.canvasEl = null;
		this.ctx = null;
		this.editorScene.destructor();
		this._editingEntity = null;
		this.selectionManager.destructor();
		this.selectionManager = null;
	}

	get editingEntity(){
		return this._editingEntity;
	}

	set editingEntity(val){
		if(this._editingEntity){
			this.editorScene.remove(this._editingEntity);
		}
		this._editingEntity = val;
		this.editorScene.add(val);
		this.render();
		this.updateOutliners();
		this.updateLiveAssetChangeListeners();
	}

	onWindowResize(w, h){
		this.canvasEl.width = w;
		this.canvasEl.height = h;

		this.editorCamComponent.aspect = w / h;
		this.renderDirty = true;
	}

	newEmptyEditingEntity(){
		this.editingEntity = new Entity();
	}

	createTempDebugObject(){
		this.editingEntity = new Entity({name: "object"});

		let cube = new Entity({name:"cube"});
		let cubeMesh = new Mesh();
		cubeMesh.setBuffer(Mesh.AttributeTypes.INDEX, [0,1,2, 1,2,3,  4,5,6, 5,6,7,  8,9,10, 9,10,11,  12,13,14, 13,14,15,  16,17,18, 17,18,19,  20,21,22, 21,22,23]);
		cubeMesh.setBuffer(Mesh.AttributeTypes.POSITION, [
			new Vec3(-1,-1,-1),
			new Vec3(-1,-1, 1),
			new Vec3(-1, 1,-1),
			new Vec3(-1, 1, 1),

			new Vec3( 1,-1,-1),
			new Vec3( 1,-1, 1),
			new Vec3( 1, 1,-1),
			new Vec3( 1, 1, 1),

			new Vec3(-1,-1,-1),
			new Vec3(-1,-1, 1),
			new Vec3( 1,-1,-1),
			new Vec3( 1,-1, 1),

			new Vec3(-1, 1,-1),
			new Vec3(-1, 1, 1),
			new Vec3( 1, 1,-1),
			new Vec3( 1, 1, 1),

			new Vec3(-1,-1,-1),
			new Vec3(-1, 1,-1),
			new Vec3( 1,-1,-1),
			new Vec3( 1, 1,-1),

			new Vec3(-1,-1, 1),
			new Vec3(-1, 1, 1),
			new Vec3( 1,-1, 1),
			new Vec3( 1, 1, 1),
		]);
		let cubeMat = new Material();
		cube.addComponent(ComponentTypes.mesh, {mesh: cubeMesh, materials: [cubeMat]});

		this.editingEntity.add(cube);

		let cam = new Entity({name:"cam"});
		this.editingEntity.add(cam);
		cam.addComponent(ComponentTypes.camera);
	}

	loadEntityAsset(entity, entityUuid){
		this.editingEntity = entity;
		this.editingEntityUuid = entityUuid;
	}

	async saveEntityAsset(){
		if(!this.editingEntityUuid) return;
		const path = await editor.projectManager.assetManager.getAssetPathFromUuid(this.editingEntityUuid);
		const fs = editor.projectManager.currentProjectFileSystem;
		const json = this.editingEntity.toJson({
			assetManager: editor.projectManager.assetManager,
		});
		await fs.writeJson(path, {
			assetType: "JJ:entity",
			asset: json,
		});
	}

	loop(){
		this.orbitControls.loop();
		this.renderDirty = true;

		if(this.renderDirty){
			this.render();
			this.renderDirty = false;
		}
	}

	async render(){
		let renderer = editor.renderer;
		renderer.render(this.editorCamComponent);
		this.ctx.transferFromImageBitmap(await renderer.getImageBitmap());
	}

	updateOutliners(){
		for(const outliner of editor.windowManager.getContentWindowsByType(ContentWindowOutliner)){
			outliner.setLinkedEntityEditor(this);
		}
	}

	updateLiveAssetChangeListeners(){
		for(const {projectAsset, listener} of this.createdLiveAssetChangeListeners){
			projectAsset.removeOnNewLiveAssetInstance(listener);
		}
		this.createdLiveAssetChangeListeners.clear();

		for(const entity of this.editingEntity.traverseDown()){
			for(const component of entity.components){
				const componentData = component.getComponentData();
				this.addComponentLiveAssetListeners(componentData.properties, component, true);
			}
		}
	}

	addComponentLiveAssetListeners(structure, data, isRoot=false, parentObject=null, propertyChangeName=null){
		if(isRoot || structure.type == Object){
			for(const [name, propertyData] of Object.entries(structure)){
				const dataItem = data[name];
				this.addComponentLiveAssetListeners(propertyData, data[name], false, data, name);
			}
		}else if(structure.type == Array){
			for(const [i, item] of data.entries()){
				this.addComponentLiveAssetListeners(structure.arrayOpts, item, false, data, i);
			}
		}else if(editor.projectAssetTypeManager.constructorHasAssetType(structure.type)){
			if(data){
				const projectAsset = editor.projectManager.assetManager.getProjectAssetForLiveAsset(data);
				const listener = async _ => {
					parentObject[propertyChangeName] = await projectAsset.getLiveAsset();
				}
				projectAsset.onNewLiveAssetInstance(listener);
				this.createdLiveAssetChangeListeners.add({projectAsset, listener});
			}
		}
	}
}
