import {Vec3} from "../math/Vec3.js";

/** @typedef {(isHovering: boolean) => void} OnIsHoveringChangeCb */
/** @typedef {() => void} OnDragCb */

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
		/** @type {Set<OnIsHoveringChangeCb>} */
		this._onIsHoveringChangeCbs = new Set();
		/** @type {Set<import("./GizmoPointerDevice.js").GizmoPointerDevice>} */
		this._hoveringPointers = new Set();

		/**
		 * @private
		 * @type {import("./GizmoPointerDevice.js").GizmoPointerDevice?}
		 */
		this.activeDraggingPointer = null;
		/**
		 * @private
		 * @type {import("../math/Vec2.js").Vec2?}
		 */
		this.dragStartScreenPos = null;

		/**
		 * @private
		 * @type {Set<OnDragCb>}
		 */
		this.onDragCbs = new Set();

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
		const isHovering = this._hoveringPointers.size > 0;
		if (isHovering != this._isHovering) {
			this._isHovering = isHovering;
			this._onIsHoveringChangeCbs.forEach(cb => cb(isHovering));
		}
	}

	/**
	 * @param {import("./GizmoPointerDevice.js").GizmoPointerDevice} pointerDevice
	 * @param {import("../math/Vec2.js").Vec2} screenPos
	 */
	pointerDown(pointerDevice, screenPos) {
		if (this.activeDraggingPointer) return;

		this.activeDraggingPointer = pointerDevice;
		this.dragStartScreenPos = screenPos.clone();
	}

	/**
	 * @param {import("./GizmoPointerDevice.js").GizmoPointerDevice} pointerDevice
	 * @param {import("../math/Vec2.js").Vec2} screenPos
	 */
	pointerUp(pointerDevice, screenPos) {
		if (this.activeDraggingPointer != pointerDevice) return;

		this.activeDraggingPointer = null;
		this.dragStartScreenPos = null;
	}

	/**
	 * @param {import("./GizmoPointerDevice.js").GizmoPointerDevice} pointerDevice
	 * @param {import("../math/Vec2.js").Vec2} screenPos
	 */
	pointerMove(pointerDevice, screenPos) {
		if (this.activeDraggingPointer != pointerDevice) return;
		if (!this.dragStartScreenPos) return;

		this.onDragCbs.forEach(cb => cb());
	}

	/**
	 * @param {OnIsHoveringChangeCb} cb
	 */
	onIsHoveringChange(cb) {
		this._onIsHoveringChangeCbs.add(cb);
	}

	/**
	 * @param {OnIsHoveringChangeCb} cb
	 */
	removeOnIsHoveringChange(cb) {
		this._onIsHoveringChangeCbs.delete(cb);
	}

	/**
	 * @param {OnDragCb} cb
	 */
	onDrag(cb) {
		this.onDragCbs.add(cb);
	}

	/**
	 * @param {OnDragCb} cb
	 */
	removeOnDrag(cb) {
		this.onDragCbs.delete(cb);
	}
}
