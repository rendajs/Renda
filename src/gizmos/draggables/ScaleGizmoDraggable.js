import { Vec2 } from "../../math/Vec2.js";
import { GizmoDraggable } from "./GizmoDraggable.js";

/**
 * @typedef ScaleGizmoDragEvent
 * @property {number} worldDelta The change in distance from the starting point since the last event.
 */

/**
 * @extends {GizmoDraggable<ScaleGizmoDragEvent>}
 */
export class ScaleGizmoDraggable extends GizmoDraggable {
	/**
	 * @param  {ConstructorParameters<typeof GizmoDraggable>} args
	 */
	constructor(...args) {
		super(...args);

		/** @private */
		this._prevDragScreenDelta = 0;
	}

	/**
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerDevice} pointerDevice
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerEventData} eventData
	 */
	handlePointerDown(pointerDevice, eventData) {
		this._prevDragScreenDelta = this._computeScreenDelta(eventData);
	}

	/**
	 * @private
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerEventData} eventData
	 */
	_computeScreenDelta(eventData) {
		const entityScreenPos3d = eventData.camera.worldToScreenPos(this.entity.worldPos);
		const entityScreenPos = new Vec2(entityScreenPos3d.x, entityScreenPos3d.y);
		return entityScreenPos.distanceTo(eventData.screenPos);
	}

	/**
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerDevice} pointerDevice
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerEventData} eventData
	 */
	handlePointerMove(pointerDevice, eventData) {
		const newDelta = this._computeScreenDelta(eventData);
		const scaleDelta = newDelta / this._prevDragScreenDelta;
		this._prevDragScreenDelta = newDelta;

		/** @type {ScaleGizmoDragEvent} */
		const moveEvent = {
			worldDelta: scaleDelta,
		};
		this.fireDragCallbacks(moveEvent);
	}
}
