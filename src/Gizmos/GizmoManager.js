import Entity from "../Core/Entity.js";
import defaultEngineAssetsManager from "../Assets/defaultEngineAssetsManager.js";

export default class GizmoManager{
	constructor(){
		this.entity = new Entity("gizmos");
		this.gizmos = new Set();

		this.billboardVertexState = null;
		this.meshVertexState = null;

		this.billboardMaterial = null;
		this.meshMaterial = null;

		this.init();
	}

	async init(){
		this.billboardVertexState = await defaultEngineAssetsManager.getAsset("9d9ebd2e-c657-4252-b7af-b5889a4986c3");
		this.billboardMaterial = await defaultEngineAssetsManager.getAsset("6ebfe5aa-6754-406e-a238-ec052eefa7df");
		this.meshVertexState = await defaultEngineAssetsManager.getAsset("2a5ca9e6-6790-441b-8764-a07fbb438d1a");
		this.meshMaterial = await defaultEngineAssetsManager.getAsset("47f64a6d-9629-4921-8b1a-a244af1aa568");
	}

	destructor(){
		for(const gizmo of this.gizmos){
			this.removeGizmo(gizmo);
		}
		this.entity.detachParent();
	}

	addGizmo(constructor){
		const gizmo = new constructor(this);
		this.gizmos.add(gizmo);
		this.entity.add(gizmo.entity);
		return gizmo;
	}

	removeGizmo(gizmo){
		gizmo.destructor();
		this.gizmos.delete(gizmo);
	}
}
