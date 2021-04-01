import Entity from "../../Core/Entity.js";

export default class Gizmo{
	constructor(gizmoManager){
		this.gizmoManager = gizmoManager;
		this.entity = new Entity("gizmo");
	}

	get pos(){
		return this.entity.pos;
	}

	set pos(val){
		this.entity.pos = val;
	}

	destructor(){
		this.entity.detachParent();
		this.mesh.destructor();
		this.mesh = null;
	}
}
