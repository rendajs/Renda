import { Entity } from "../../core/Entity.js";

export class Gizmo {
	/**
	 * @param {import("../GizmoManager.js").GizmoManager} gizmoManager
	 */
	constructor(gizmoManager) {
		this.gizmoManager = gizmoManager;
		this.entity = new Entity("Gizmo (" + this.constructor.name + ")");
	}

	get pos() {
		return this.entity.pos;
	}

	set pos(val) {
		this.entity.pos = val;
	}

	get rot() {
		return this.entity.rot;
	}

	set rot(val) {
		this.entity.rot = val;
	}

	get scale() {
		return this.entity.scale;
	}

	set scale(val) {
		this.entity.scale = val;
	}

	/**
	 * @param {import("../../math/Mat4.js").Mat4} val
	 */
	set matrix(val) {
		// TODO: this is a bit weird, gizmos should have a function for
		// setting the matrix and each gizmo should be able to configure
		// if only position, rotation or scale should be applied
		this.entity.localMatrix = val;
	}

	destructor() {
		this.entity.detachParent();
	}

	/**
	 * This is called when the GizmoManager built-in assets have changed.
	 * In here you can assign the new assets to your components,
	 * such as materials or mesh vertex states.
	 */
	updateAssets() {}

	/**
	 * Call this to let the renderer know that the gizmo has been changed and
	 * needs to be rendered again.
	 */
	gizmoNeedsRender() {
		this.gizmoManager.gizmoNeedsRender(this);
	}
}
