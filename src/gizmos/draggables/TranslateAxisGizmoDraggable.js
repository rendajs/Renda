import { Vec3 } from "../../math/Vec3.js";
import { closestPointBetweenLines } from "../../math/closestPointBetweenLines.js";
import { GizmoDraggable } from "./GizmoDraggable.js";

/**
 * @typedef TranslateAxisGizmoDragEvent
 * @property {Vec3} worldDelta The change in world position since the last event.
 * @property {number} localDelta The changed distance since the last position.
 * Negative when moved in the opposite direction of the provided axis.
 */

/**
 * A draggable that can be translated along a single axis.
 * @extends {GizmoDraggable<TranslateAxisGizmoDragEvent>}
 */
export class TranslateAxisGizmoDraggable extends GizmoDraggable {
	/**
	 * @param  {ConstructorParameters<typeof GizmoDraggable>} args
	 */
	constructor(...args) {
		super(...args);

		/**
		 * The local axis in which direction the draggable can be dragged.
		 * Since this is local, this means that if the gizmo of the draggable is
		 * rotated, the axis in word space is changed as well.
		 */
		this.axis = Vec3.right;

		/** @private @type {Vec3?} */
		this.dragStartWorldPos = null;

		/** @private @type {import("../../math/Vec2.js").Vec2?} */
		this.dragStartScreenPos = null;
		/** @private @type {import("../../math/Vec2.js").Vec2?} */
		this.dragStartScreenPosPointer = null;

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
		this.dragStartWorldPos = this.entity.worldPos.clone();
		this.dragStartScreenPos = eventData.camera.worldToScreenPos(this.dragStartWorldPos).toVec2();
		this.dragStartScreenPosPointer = eventData.screenPos;
		this.prevDragWorldPos.set(this.dragStartWorldPos);
	}

	/**
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerDevice} pointerDevice
	 */
	handlePointerUp(pointerDevice) {
		this.dragStartScreenPosPointer = null;
	}

	/**
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerDevice} pointerDevice
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerEventData} eventData
	 */
	handlePointerMove(pointerDevice, eventData) {
		if (!this.dragStartScreenPos || !this.dragStartScreenPosPointer || !this.dragStartWorldPos) return;

		/**
		 * A direction vector pointing in the direction in which the
		 * draggable can be dragged.
		 */
		const axisWorld = this.axis.clone().rotate(this.entity.worldRot);

		// First we create two points on the axis line that intersects with the
		// point where the user started dragging.
		const axisPosWorldA = this.dragStartWorldPos.clone();
		const axisPosWorldB = axisPosWorldA.clone().add(axisWorld);

		// Then we convert these two points to screen space.
		const axisPosScreenA = eventData.camera.worldToScreenPos(axisPosWorldA).toVec2();
		const axisPosScreenB = eventData.camera.worldToScreenPos(axisPosWorldB).toVec2();

		/** The normalised axis vector in screen space */
		const deltaAxisScreen = axisPosScreenB.clone().sub(axisPosScreenA);
		deltaAxisScreen.normalize();

		/** The amount dragged by the cursor since the start of the drag. */
		const deltaMoveScreen = eventData.screenPos.clone().sub(this.dragStartScreenPosPointer);
		deltaMoveScreen.projectOnVector(deltaAxisScreen);

		const newScreenPos = this.dragStartScreenPos.clone().add(deltaMoveScreen);
		const ray = eventData.camera.getRaycastRayFromScreenPos(newScreenPos);

		const newWorldPos = closestPointBetweenLines(this.dragStartWorldPos, axisWorld, ray.start, ray.dir);

		/** The change in world position since the last event. */
		const deltaWorldPos = newWorldPos.clone().sub(this.prevDragWorldPos);
		this.prevDragWorldPos.set(newWorldPos);

		let localDelta = deltaWorldPos.magnitude;
		if (deltaWorldPos.dot(axisWorld) < 0) {
			localDelta *= -1;
		}

		this.fireDragCallbacks({
			worldDelta: deltaWorldPos,
			localDelta,
		});
	}
}
