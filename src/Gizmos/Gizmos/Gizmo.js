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

	get rot(){
		return this.entity.rot;
	}

	set rot(val){
		this.entity.rot = val;
	}

	destructor(){
		this.entity.detachParent();
		this.mesh.destructor();
		this.mesh = null;
	}
}
