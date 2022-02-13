import {Entity} from "../../core/Entity.js";

export class Gizmo {
	/**
	 * @param {import("../GizmoManager.js").GizmoManager} gizmoManager
	 */
	constructor(gizmoManager) {
		this.gizmoManager = gizmoManager;
		this.entity = new Entity("gizmo (" + this.constructor.name + ")");
	}

	/**
	 * @param {import("../../mod.js").Mat4} val
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

	/**
	 * Call this to let the renderer know that the gizmo has been changed and
	 * needs to be rendered again.
	 */
	gizmoNeedsRender() {
		this.gizmoManager.gizmoNeedsRender(this);
	}
}
