import {domSpaceToScreenSpace} from "../util/cameraUtil.js";

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
		this._currentlyHoveringDraggable = null;

		/** @type {import("./GizmoDraggable.js").GizmoDraggable?} */
		this._activeButtonDraggable = null;

		this._hasActiveButton = false;

		this.destructed = false;
	}

	destructor() {
		this.destructed = true;

		if (this._currentlyHoveringDraggable) {
			this._currentlyHoveringDraggable.pointerOut(this);
			this._currentlyHoveringDraggable = null;
		}
	}

	get hasActiveButton() {
		return this._hasActiveButton;
	}

	get currentlyHoveringDraggable() {
		return this._currentlyHoveringDraggable;
	}

	/**
	 * @param {import("../mod.js").CameraComponent} camera
	 * @param {HTMLElement} element
	 * @param {PointerEvent} event
	 */
	handle2dEvent(camera, element, event) {
		const screenSpace = domSpaceToScreenSpace(element, event.clientX, event.clientY);
		const hit = this.gizmoManager.raycastDraggables(camera, screenSpace);
		const hasActiveButton = event.buttons !== 0;

		if (hit != this._currentlyHoveringDraggable) {
			if (this._currentlyHoveringDraggable) {
				this._currentlyHoveringDraggable.pointerOut(this);
				this._currentlyHoveringDraggable = null;
			}

			if (hit) {
				this._currentlyHoveringDraggable = hit;
				hit.pointerOver(this);
			}
		}

		if (hasActiveButton != this._hasActiveButton) {
			this._hasActiveButton = hasActiveButton;
			if (hasActiveButton) {
				if (this._currentlyHoveringDraggable) {
					this._currentlyHoveringDraggable.pointerDown(this);
					this._activeButtonDraggable = this._currentlyHoveringDraggable;
				}
			} else {
				if (this._activeButtonDraggable) {
					this._activeButtonDraggable.pointerUp(this);
					this._activeButtonDraggable = null;
				}
			}
		}
	}
}
