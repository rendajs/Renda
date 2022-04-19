import {Vec3} from "../../math/Vec3.js";
import {closestPointBetweenLines} from "../../math/closestPointBetweenLines.js";
import {GizmoDraggable} from "./GizmoDraggable.js";

/**
 * A draggable that can be translated along a single axis.
 * @extends {GizmoDraggable<import("./TranslateGizmoDraggable.js").GizmoDragMoveEvent>}
 */
export class TranslateAxisGizmoDraggable extends GizmoDraggable {
	/**
	 * @param  {ConstructorParameters<typeof GizmoDraggable>} args
	 */
	constructor(...args) {
		super(...args);

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

		const axisPosWorldA = this.dragStartWorldPos.clone();
		const axisPosWorldB = axisPosWorldA.clone().add(this.axis);

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

		const newWorldPos = closestPointBetweenLines(this.dragStartWorldPos, this.axis, ray.start, ray.dir);

		/** The change in world position since the last event. */
		const deltaWorldPos = newWorldPos.clone().sub(this.prevDragWorldPos);
		this.prevDragWorldPos.set(newWorldPos);

		/** @type {import("./TranslateGizmoDraggable.js").GizmoDragMoveEvent} */
		const moveEvent = {
			delta: deltaWorldPos,
		};
		this.fireDragCallbacks(moveEvent);
	}
}
