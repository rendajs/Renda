import ContentWindow from "./ContentWindow.js";
import ContentWindowOutliner from "./ContentWindowOutliner.js";
import ContentWindowBuildView from "./ContentWindowBuildView.js";
import Button from "../../UI/Button.js";
import {Entity, Mesh, Vec3, Material, CameraComponent, GizmoManager, LightIconGizmo, CameraIconGizmo, CameraGizmo} from "../../../../src/index.js";
import editor from "../../editorInstance.js";
import SelectionManager from "../../Managers/SelectionManager.js";
import OrbitControls from "../../Util/OrbitControls.js";

export default class ContentWindowEntityEditor extends ContentWindow{
	constructor(){
		super();

		this.setContentBehindTopBar(true);

		let saveEntityButton = new Button({
			text: "Save",
			onClick: () => {
				this.saveEntityAsset();
			}
		});
		this.addTopBarButton(saveEntityButton);

		this.domTarget = editor.renderer.createDomTarget();
		const renderTargetElement = this.domTarget.getElement();
		this.contentEl.appendChild(renderTargetElement);

		this.renderDirty = false;
		this.onRenderDirtyCbs = new Set();

		this.editorScene = new Entity("editorScene");
		this.editorCamera = new Entity("editorCamera");
		this.editorScene.add(this.editorCamera);
		this.editorCamComponent = this.editorCamera.addComponent(CameraComponent);

		this.orbitControls = new OrbitControls(this.editorCamera, renderTargetElement);

		this.editingEntityUuid = null;
		this._editingEntity = null;
		this.selectionManager = new SelectionManager();

		this.createdLiveAssetChangeListeners = new Set();

		this.gizmos = new GizmoManager();
		this.editorScene.add(this.gizmos.entity);
		this.currentLinkedGizmos = new Map(); //Map<Entity, Set<Gizmo>>

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
		this.gizmos.destructor();
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
		this.updateGizmos();
		this.markRenderDirty();
		this.updateOutliners();
		this.updateBuildViews();
		this.updateLiveAssetChangeListeners();
	}

	onWindowResize(w, h){
		this.domTarget.resize(w,h);

		this.editorCamComponent.aspect = w / h;
		this.markRenderDirty();
	}

	markRenderDirty(notifyExternalRenders = true){
		this.renderDirty = true;
		if(notifyExternalRenders){
			for(const cb of this.onRenderDirtyCbs){
				cb();
			}
		}
	}

	onRenderDirty(cb){
		this.onRenderDirtyCbs.add(cb);
	}

	removeOnRenderDirty(cb){
		this.onRenderDirtyCbs.add(cb);
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
			assetTypeManager: editor.projectAssetTypeManager,
		});
		await fs.writeJson(path, {
			assetType: "JJ:entity",
			asset: json,
		});
	}

	loop(){
		if(this.orbitControls){
			const camChanged = this.orbitControls.loop();
			if(camChanged){
				this.markRenderDirty(false);
			}
		}

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

	updateBuildViews(){
		for(const buildView of editor.windowManager.getContentWindowsByType(ContentWindowBuildView)){
			buildView.setLinkedEntityEditor(this);
		}
	}

	updateGizmos(){
		const unusedEntities = new Map(this.currentLinkedGizmos);
		for(const entity of this.editingEntity.traverseDown()){
			this.updateGizmosForEntity(entity);
			unusedEntities.delete(entity);
		}

		for(const [entity, linkedComponentGizmos] of unusedEntities){
			for(const componentGizmos of linkedComponentGizmos.values()){
				componentGizmos.destructor();
			}
			this.currentLinkedGizmos.delete(entity);
		}
	}

	updateGizmosForEntity(entity, removeAll = false){
		let linkedComponentGizmos = this.currentLinkedGizmos.get(entity);
		if(!linkedComponentGizmos){
			linkedComponentGizmos = new Map();
		}
		const unusedComponentGizmos = new Map(linkedComponentGizmos);
		if(!removeAll){
			for(const component of entity.components){
				let componentGizmos = linkedComponentGizmos.get(component);
				if(!componentGizmos){
					const componentType = component.getComponentData();
					componentGizmos = editor.componentGizmosManager.createComponentGizmosInstance(componentType, component, this.gizmos);
					if(componentGizmos){
						componentGizmos.entityMatrixChanged(entity.worldMatrix);
						linkedComponentGizmos.set(component, componentGizmos);
					}
				}else{
					unusedComponentGizmos.delete(component);
				}
				if(componentGizmos){
					componentGizmos.componentPropertyChanged();
				}
			}
		}
		for(const [component, componentGizmos] of unusedComponentGizmos){
			componentGizmos.destructor();
			linkedComponentGizmos.delete(component);
		}
		if(linkedComponentGizmos.size > 0){
			this.currentLinkedGizmos.set(entity, linkedComponentGizmos);
		}else{
			this.currentLinkedGizmos.delete(entity);
		}
	}

	updateGizmoPositionsForEntity(entity){
		const linkedComponentGizmos = this.currentLinkedGizmos.get(entity);
		if(linkedComponentGizmos){
			for(const componentGizmos of linkedComponentGizmos.values()){
				componentGizmos.entityMatrixChanged(entity.worldMatrix);
			}
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
				const listener = async () => {
					parentObject[propertyChangeName] = await projectAsset.getLiveAsset();
				}
				projectAsset.onNewLiveAssetInstance(listener);
				this.createdLiveAssetChangeListeners.add({projectAsset, listener});
			}
		}
	}

	//type can be "create", "delete", "transform", "component" or "componentProperty"
	notifyEntityChanged(entity, type){
		if(!this.editingEntity.containsChild(entity) && type != "delete") return;

		this.markRenderDirty();

		if(type == "transform"){
			this.updateGizmoPositionsForEntity(entity);
		}else if(type == "component" || type == "componentProperty"){
			this.updateGizmosForEntity(entity);
		}else if(type == "delete"){
			this.updateGizmosForEntity(entity, true);
		}
	}
}
