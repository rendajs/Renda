import {Vec3} from "../math/Vec3.js";

export class GizmoDraggable {
	/** @typedef {import("../components/builtIn/CameraComponent.js").CameraComponent} CameraComponent */
	/**
	 * A draggable is something that can be requested from the gizmo manager.
	 * Usually this is done by gizmos, but you can also request them directly.
	 * Draggables handle events from pointer devices such as hovering or dragging.
	 * @param {import("./GizmoManager.js").GizmoManager} gizmoManager
	 */
	constructor(gizmoManager) {
		this.gizmoManager = gizmoManager;

		this.pos = new Vec3();
		this._isHovering = false;
		/** @type {Set<import("./GizmoPointerDevice.js").GizmoPointerDevice>} */
		this._hoveringPointers = new Set();

		/** @type {Set<import("../math/types.js").RaycastShape>} */
		this.shapes = new Set();
	}

	get isHovering() {
		return this._isHovering;
	}

	/**
	 * @param {import("../Components/builtIn/CameraComponent.js").CameraComponent} camera
	 */
	getScreenPos(camera) {
		return camera.worldToScreenPos(this.pos);
	}

	/**
	 * @param {import("../math/types.js").RaycastShape} shape
	 */
	addRaycastShape(shape) {
		this.shapes.add(shape);
	}

	/**
	 * @param {Vec3} start
	 * @param {Vec3} dir
	 */
	raycast(start, dir) {
		start = start.clone().sub(this.pos);

		let closestResult = null;
		let closestDist = Infinity;
		for (const shape of this.shapes) {
			const result = shape.raycast(start, dir);
			if (result) {
				if (result.dist < closestDist) {
					closestDist = result.dist;
					closestResult = result;
				}
			}
		}
		return closestResult;
	}

	/**
	 * @param {import("./GizmoPointerDevice.js").GizmoPointerDevice} pointerDevice
	 */
	pointerOver(pointerDevice) {
		this._hoveringPointers.add(pointerDevice);
		this._updateIsHovering();
	}

	/**
	 * @param {import("./GizmoPointerDevice.js").GizmoPointerDevice} pointerDevice
	 */
	pointerOut(pointerDevice) {
		this._hoveringPointers.delete(pointerDevice);
		this._updateIsHovering();
	}

	_updateIsHovering() {
		this._isHovering = this._hoveringPointers.size > 0;
	}
}
