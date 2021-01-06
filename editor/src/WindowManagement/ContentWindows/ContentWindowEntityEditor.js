import ContentWindow from "./ContentWindow.js";
import ContentWindowOutliner from "./ContentWindowOutliner.js";
import Button from "../../UI/Button.js";
import {Entity, Mesh, Vec3, Material, DefaultComponentTypes} from "../../../../src/index.js";
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

		this.domTarget = editor.renderer.createDomTarget();
		const renderTargetElement = this.domTarget.getElement();
		this.contentEl.appendChild(renderTargetElement);

		this.renderDirty = false;

		this.editorScene = new Entity({name: "editorScene"});
		this.editorCamera = new Entity({name: "editorCamera"});
		this.editorScene.add(this.editorCamera);
		this.editorCamComponent = this.editorCamera.addComponent(DefaultComponentTypes.camera);

		this.orbitControls = new OrbitControls(this.editorCamera, renderTargetElement);

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

		this.domTarget.destructor();
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
		this.domTarget.resize(w,h);

		this.editorCamComponent.aspect = w / h;
		this.renderDirty = true;
	}

	newEmptyEditingEntity(){
		this.editingEntity = new Entity();
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

	render(){
		this.domTarget.render(this.editorCamComponent);
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
