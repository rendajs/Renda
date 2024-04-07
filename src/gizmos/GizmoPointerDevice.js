import { domSpaceToScreenSpace } from "../util/cameraUtil.js";

/**
 * @typedef GizmoPointerEventData
 * @property {import("../math/Vec2.js").Vec2} screenPos
 * @property {import("../components/builtIn/CameraComponent.js").CameraComponent} camera
 */

export class GizmoPointerDevice {
	/** @type {import("./draggables/GizmoDraggable.js").GizmoDraggable?} */
	#currentlyHoveringDraggable = null;

	/** @type {import("./draggables/GizmoDraggable.js").GizmoDraggable?} */
	#activeButtonDraggable = null;

	/** @type {GizmoPointerEventData?} */
	#lastPointerEventData = null;

	/**
	 * Whether the main input method of this pointer device (i.e. a mouse button,
	 * touch touching a screen, or main button on a vr controller) is currently
	 * active. When this is true, the pointer device might actively be dragging
	 * a draggable.
	 */
	#hasActiveButton = false;

	#activeButtonIsForced = false;

	/**
	 * A PointerDevices are requested from the GizmoManager, a single pointer
	 * device represents a specific input such as a single touch, mouse cursor
	 * or a hand/controller from an XR device.
	 *
	 * @param {import("./GizmoManager.js").GizmoManager} gizmoManager
	 */
	constructor(gizmoManager) {
		this.gizmoManager = gizmoManager;

		this.destructed = false;
	}

	destructor() {
		this.destructed = true;

		this.#setHoveringDraggable(null);
		this.#setHasActiveButton(false, false);
	}

	get hasActiveButton() {
		return this.#hasActiveButton;
	}

	get currentlyHoveringDraggable() {
		return this.#currentlyHoveringDraggable;
	}

	/**
	 * @param {import("../components/builtIn/CameraComponent.js").CameraComponent} camera
	 * @param {HTMLElement} element
	 * @param {PointerEvent} event
	 */
	handle2dEvent(camera, element, event) {
		const screenSpace = domSpaceToScreenSpace(element, event.clientX, event.clientY);
		const hit = this.gizmoManager.raycastDraggables(camera, screenSpace);
		const hasActiveButton = event.buttons !== 0;

		this.#lastPointerEventData = {
			camera,
			screenPos: screenSpace,
		};

		if (!this.#activeButtonIsForced) this.#setHoveringDraggable(hit);

		if (this.#activeButtonDraggable) {
			this.#activeButtonDraggable.pointerMove(this, this.#lastPointerEventData);
		}

		if (!this.#activeButtonIsForced) this.#setHasActiveButton(hasActiveButton, false);

		if (this.#activeButtonIsForced && this.#hasActiveButton == hasActiveButton) {
			this.#activeButtonIsForced = false;
		}
	}

	/**
	 * Notifies the draggable that it is being hovered by this pointer.
	 * This function takes care of subsequent calls and makes sure events are only fired once.
	 * Pass null to stop hovering over the current draggable.
	 * @param {import("./draggables/GizmoDraggable.js").GizmoDraggable?} draggable
	 */
	#setHoveringDraggable(draggable) {
		if (draggable != this.#currentlyHoveringDraggable) {
			if (this.#currentlyHoveringDraggable) {
				this.#currentlyHoveringDraggable.pointerOut(this);
				this.#currentlyHoveringDraggable = null;
			}

			if (draggable) {
				this.#currentlyHoveringDraggable = draggable;
				draggable.pointerOver(this);
			}
		}
	}

	/**
	 * Notifies the draggable that is currently being hovered that this pointer device
	 * started or stopped dragging it.
	 * @param {boolean} hasActiveButton
	 * @param {boolean} force
	 */
	#setHasActiveButton(hasActiveButton, force) {
		if (hasActiveButton != this.#hasActiveButton) {
			this.#hasActiveButton = hasActiveButton;
			this.#activeButtonIsForced = force;
			if (hasActiveButton) {
				if (this.#currentlyHoveringDraggable) {
					if (!this.#lastPointerEventData) {
						throw new Error("Failed to start dragging a gizmo pointer device, this pointer does not have a location yet.");
					}
					this.#currentlyHoveringDraggable.pointerDown(this, this.#lastPointerEventData);
					this.#activeButtonDraggable = this.#currentlyHoveringDraggable;
				}
			} else {
				if (this.#activeButtonDraggable) {
					this.#activeButtonDraggable.pointerUp(this);
					this.#activeButtonDraggable = null;
				}
			}
		}
	}

	/**
	 * Forcefully sets the dragging state of a draggable. The device will keep
	 * dragging the draggable even though the main button might not actually be down.
	 * Pass null to forcefully stop dragging the current draggable.
	 * The device will stop dragging once either its main button is down again or when
	 * this is called with `null`.
	 * @param {import("./draggables/GizmoDraggable.js").GizmoDraggable?} draggable
	 */
	forceDragDraggable(draggable) {
		this.#setHoveringDraggable(draggable);
		this.#setHasActiveButton(Boolean(draggable), true);
	}
}
