import ContentWindow from "./ContentWindow.js";
import ContentWindowOutliner from "./ContentWindowOutliner.js";
import Button from "../../UI/Button.js";
import {Entity, Mesh, Vec3, Material, DefaultComponentTypes, GizmoManager, LightGizmo} from "../../../../src/index.js";
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

		this.editorScene = new Entity("editorScene");
		this.editorCamera = new Entity("editorCamera");
		this.editorScene.add(this.editorCamera);
		this.editorCamComponent = this.editorCamera.addComponent(DefaultComponentTypes.camera);

		this.orbitControls = new OrbitControls(this.editorCamera, renderTargetElement);

		this.editingEntityUuid = null;
		this._editingEntity = null;
		this.selectionManager = new SelectionManager();

		this.createdLiveAssetChangeListeners = new Set();

		this.gizmoTypesMap = new Map([
			[DefaultComponentTypes.light, LightGizmo],
		]);

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
		const camChanged = this.orbitControls.loop();
		if(camChanged){
			this.renderDirty = true;
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

	updateGizmos(){
		const unusedEntities = new Map(this.currentLinkedGizmos);
		for(const entity of this.editingEntity.traverseDown()){
			this.updateGizmosForEntity(entity);
			unusedEntities.delete(entity);
		}

		for(const [entity, linkedGizmos] of unusedEntities){
			for(const gizmo of linkedGizmos.values()){
				this.gizmos.removeGizmo(gizmo);
			}
			this.currentLinkedGizmos.delete(entity);
		}
	}

	updateGizmosForEntity(entity){
		let linkedGizmos = this.currentLinkedGizmos.get(entity);
		if(!linkedGizmos){
			linkedGizmos = new Map();
		}
		const unusedGizmos = new Map(linkedGizmos);
		for(const component of entity.components){
			const gizmoType = this.gizmoTypesMap.get(component.componentType);
			if(gizmoType){
				let gizmo = linkedGizmos.get(gizmoType);
				if(!gizmo){
					gizmo = this.gizmos.addGizmo(gizmoType);
					gizmo.pos = entity.pos;
					linkedGizmos.set(gizmoType, gizmo);
				}
				unusedGizmos.delete(gizmoType);
			}
		}
		for(const [gizmoType, gizmo] of unusedGizmos){
			this.gizmos.removeGizmo(gizmo);
			linkedGizmos.delete(gizmoType);
		}
		if(linkedGizmos.size > 0){
			this.currentLinkedGizmos.set(entity, linkedGizmos);
		}else{
			this.currentLinkedGizmos.delete(entity);
		}
	}

	updateGizmoPositionsForEntity(entity){
		const linkedGizmos = this.currentLinkedGizmos.get(entity);
		if(linkedGizmos){
			for(const gizmo of linkedGizmos.values()){
				gizmo.pos = entity.pos;
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
				const listener = async _ => {
					parentObject[propertyChangeName] = await projectAsset.getLiveAsset();
				}
				projectAsset.onNewLiveAssetInstance(listener);
				this.createdLiveAssetChangeListeners.add({projectAsset, listener});
			}
		}
	}

	//type can be "pos", "rot", "scale", "component" or "componentProperty"
	onEntityChanged(entity, type){
		if(!this.editingEntity.containsChild(entity)) return;

		this.renderDirty = true;

		if(type == "pos"){
			this.updateGizmoPositionsForEntity(entity);
		}else if(type == "component"){
			this.updateGizmosForEntity(entity);
		}
	}
}
