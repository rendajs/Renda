import {Entity} from "../../Core/Entity.js";

export class Gizmo {
	/**
	 * @param {import("../GizmoManager.js").GizmoManager} gizmoManager
	 */
	constructor(gizmoManager) {
		this.gizmoManager = gizmoManager;
		this.entity = new Entity("gizmo (" + this.constructor.name + ")");
	}

	/**
	 * @param {import("../../index.js").Mat4} val
	 */
	set matrix(val) {
		this.entity.localMatrix = val;
	}

	destructor() {
		this.entity.detachParents();
	}

	// this is called when the GizmoManager built-in assets have changed
	// update your mesh components accordingly
	updateMaterials() {}
}
