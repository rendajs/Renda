import { Vec3 } from "../../math/Vec3.js";
import { Vec2 } from "../../math/Vec2.js";
import { GizmoDraggable } from "./GizmoDraggable.js";
import { Quat } from "../../math/Quat.js";

/**
 * @typedef RotateAxisGizmoDragEvent
 * @property {number} localDelta The changed angle in radians since the last position.
 * Negative when moved in the opposite direction of the provided axis.
 * @property {Quat} worldDelta The change in world rotation since the last event.
 */

/**
 * A draggable that can be rotated along a single axis.
 * @extends {GizmoDraggable<RotateAxisGizmoDragEvent>}
 */
export class RotateAxisGizmoDraggable extends GizmoDraggable {
	/**
	 * @param  {ConstructorParameters<typeof GizmoDraggable>} args
	 */
	constructor(...args) {
		super(...args);

		/**
		 * The axis that the draggable will be rotated around.
		 */
		this.axis = Vec3.right;

		/** @private @type {Vec2?} */
		this._dragStartScreenPivot = null;
		/** @private */
		this._prevAngle = new Vec2();
	}

	/**
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerDevice} pointerDevice
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerEventData} eventData
	 */
	handlePointerDown(pointerDevice, eventData) {
		this._dragStartScreenPivot = eventData.camera.worldToScreenPos(this.entity.worldPos).toVec2();
		this._prevAngle = this._get2dAngle(eventData.screenPos);
	}

	/**
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerDevice} pointerDevice
	 */
	handlePointerUp(pointerDevice) {
		this._dragStartScreenPivot = null;
	}

	/**
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerDevice} pointerDevice
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerEventData} eventData
	 */
	handlePointerMove(pointerDevice, eventData) {
		const angle = this._get2dAngle(eventData.screenPos);
		let deltaAngle = this._prevAngle.clockwiseAngleTo(angle);
		this._prevAngle.set(angle);

		const worldRot = this.entity.worldRot.clone();
		const worldAxis = new Vec3(this.axis).rotate(worldRot);

		const camWorldRot = eventData.camera.entity?.worldRot;
		if (camWorldRot) {
			const forward = Vec3.forward.rotate(camWorldRot);
			if (worldAxis.dot(forward) > 0) {
				deltaAngle *= -1;
			}
		}

		const deltaWorldRot = new Quat();
		deltaWorldRot.setFromAxisAngle(worldAxis, deltaAngle);

		/** @type {RotateAxisGizmoDragEvent} */
		const moveEvent = {
			localDelta: deltaAngle,
			worldDelta: deltaWorldRot,
		};
		this.fireDragCallbacks(moveEvent);
	}

	/**
	 * @private
	 * @param {Vec2} screenPos
	 */
	_get2dAngle(screenPos) {
		if (!this._dragStartScreenPivot) {
			throw new Error("Assertion failed, the draggable is not currently being dragged");
		}
		return this._dragStartScreenPivot.clone().sub(screenPos);
	}
}
