import {Vec3} from "../../math/Vec3.js";
import {Vec2} from "../../math/Vec2.js";
import {GizmoDraggable} from "./GizmoDraggable.js";

/**
 * A draggable that can be rotated along a single axis.
 * @extends {GizmoDraggable<import("./TranslateGizmoDraggable.js").GizmoDragMoveEvent>}
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
		/**
		 * The pivot that the draggable will be rotated around.
		 */
		this.pivot = new Vec3();

		/** @private @type {Vec2?} */
		this.dragStartScreenPivot = null;
		this.startAngle = 0;
	}

	/**
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerDevice} pointerDevice
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerEventData} eventData
	 */
	handlePointerDown(pointerDevice, eventData) {
		this.dragStartScreenPivot = eventData.camera.worldToScreenPos(this.pivot).toVec2();
	}

	/**
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerDevice} pointerDevice
	 */
	handlePointerUp(pointerDevice) {
		this.dragStartScreenPivot = null;
	}

	/**
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerDevice} pointerDevice
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerEventData} eventData
	 */
	handlePointerMove(pointerDevice, eventData) {

	}

	/**
	 * @private
	 * @param {Vec2} screenPos
	 */
	get2dAngle(screenPos) {
		screenPos.dot;
	}
}
