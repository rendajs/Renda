import Entity from "../../Core/Entity.js";

export default class Gizmo{
	constructor(gizmoManager){
		this.gizmoManager = gizmoManager;
		this.entity = new Entity("gizmo");
	}

	set matrix(val){
		this.entity.localMatrix = val;
	}

	destructor(){
		this.entity.detachParent();
		this.mesh.destructor();
		this.mesh = null;
	}
}
