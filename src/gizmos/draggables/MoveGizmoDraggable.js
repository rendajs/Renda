import {Vec3} from "../../math/Vec3.js";
import {GizmoDraggable} from "./GizmoDraggable.js";

/**
 * @typedef GizmoDragMoveEvent
 * @property {Vec3} delta The change in world position since the last event.
 */

/**
 * @extends {GizmoDraggable<GizmoDragMoveEvent>}
 */
export class MoveGizmoDraggable extends GizmoDraggable {
	/**
	 * @param  {ConstructorParameters<typeof GizmoDraggable>} args
	 */
	constructor(...args) {
		super(...args);

		/**
		 * @private
		 * @type {Vec3?}
		 */
		this.dragStartScreenPos = null;

		/**
		 * @private
		 */
		this.prevDragWorldPos = new Vec3();
	}

	/**
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerDevice} pointerDevice
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerEventData} eventData
	 */
	handlePointerDown(pointerDevice, eventData) {
		this.dragStartScreenPos = eventData.camera.worldToScreenPos(this.pos);
		const worldPos = eventData.camera.screenToWorldPos(new Vec3(eventData.screenPos.x, eventData.screenPos.y, this.dragStartScreenPos.z));
		this.prevDragWorldPos.set(worldPos);
	}

	/**
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerDevice} pointerDevice
	 */
	handlePointerUp(pointerDevice) {
		this.dragStartScreenPos = null;
	}

	/**
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerDevice} pointerDevice
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerEventData} eventData
	 */
	handlePointerMove(pointerDevice, eventData) {
		if (!this.dragStartScreenPos) return;

		/** The amount dragged in screen space since the start of the drag. */
		const screenDelta = eventData.screenPos.clone().sub(this.dragStartScreenPos);

		/** The desired new screen position of the draggable */
		const newScreenPos = this.dragStartScreenPos.clone();
		newScreenPos.add(screenDelta.x, screenDelta.y);

		/** The desired new world position of the draggable */
		const newWorldPos = eventData.camera.screenToWorldPos(newScreenPos);

		/** The change in world position since the last event. */
		const deltaWorldPos = newWorldPos.clone().sub(this.prevDragWorldPos);
		this.prevDragWorldPos.set(newWorldPos);

		/** @type {GizmoDragMoveEvent} */
		const moveEvent = {
			delta: deltaWorldPos,
		};
		this.pos.add(deltaWorldPos);
		this.fireDragCallbacks(moveEvent);
	}
}
