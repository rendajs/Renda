import {Entity} from "../../Core/Entity.js";
import GizmoManager from "../GizmoManager.js";

export default class Gizmo {
	/**
	 * @param {GizmoManager} gizmoManager
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
