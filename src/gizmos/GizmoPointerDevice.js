import {elementSpaceToScreenSpace} from "../util/cameraUtil.js";

export class GizmoPointerDevice {
	/**
	 * A PointerDevices are requested from the GizmoManager, a single pointer
	 * device represents a specific input such as a single touch, mouse cursor
	 * or a hand/controller from an XR device.
	 *
	 * @param {import("./GizmoManager.js").GizmoManager} gizmoManager
	 */
	constructor(gizmoManager) {
		this.gizmoManager = gizmoManager;

		/** @type {import("./GizmoDraggable.js").GizmoDraggable?} */
		this.currentlyHoveringDraggable = null;

		this.destructed = false;
	}

	destructor() {
		this.destructed = true;

		if (this.currentlyHoveringDraggable) {
			this.currentlyHoveringDraggable.pointerOut(this);
			this.currentlyHoveringDraggable = null;
		}
	}

	/**
	 * @param {import("../mod.js").CameraComponent} camera
	 * @param {HTMLElement} element
	 * @param {PointerEvent} event
	 */
	handle2dEvent(camera, element, event) {
		const screenSpace = elementSpaceToScreenSpace(element, event.clientX, event.clientY);
		const hit = this.gizmoManager.raycastDraggables(camera, screenSpace);

		if (hit != this.currentlyHoveringDraggable) {
			if (this.currentlyHoveringDraggable) {
				this.currentlyHoveringDraggable.pointerOut(this);
				this.currentlyHoveringDraggable = null;
			}

			if (hit) {
				this.currentlyHoveringDraggable = hit;
				hit.pointerOver(this);
			}
		}
	}
}
