import {Entity} from "../../core/Entity.js";

/** @typedef {(isHovering: boolean) => void} OnIsHoveringChangeCb */

/**
 * @typedef GizmoDraggableInitOptions
 * @property {boolean} [lockX]
 * @property {boolean} [lockY]
 * @property {boolean} [lockZ]
 */

/**
 * @typedef GizmoDraggableTypes
 * @property {import("./TranslateGizmoDraggable.js").TranslateGizmoDraggable} move
 * @property {import("./TranslateAxisGizmoDraggable.js").TranslateAxisGizmoDraggable} move-axis
 */

/** @typedef {keyof GizmoDraggableTypes} GizmoDraggableType */

/**
 * @template {GizmoDraggableType} T
 * @typedef {GizmoDraggableTypes[T]} GetGizmoDraggableType
 */

/**
 * @template [TDragEvent = unknown]
 */
export class GizmoDraggable {
	/** @typedef {(event: TDragEvent) => void} OnDragCallback */
	/** @typedef {import("../../components/builtIn/CameraComponent.js").CameraComponent} CameraComponent */
	/**
	 * A draggable is something that can be requested from the gizmo manager.
	 * Usually this is done by gizmos, but you can also request them directly.
	 * Draggables handle events from pointer devices such as hovering or dragging.
	 * @param {import("../GizmoManager.js").GizmoManager} gizmoManager
	 */
	constructor(gizmoManager) {
		this.gizmoManager = gizmoManager;

		this.entity = new Entity("GizmoDraggable (" + this.constructor.name + ")");
		this._isHovering = false;
		/** @type {Set<OnIsHoveringChangeCb>} */
		this._onIsHoveringChangeCbs = new Set();
		/** @type {Set<import("../GizmoPointerDevice.js").GizmoPointerDevice>} */
		this._hoveringPointers = new Set();

		/**
		 * @private
		 * @type {import("../GizmoPointerDevice.js").GizmoPointerDevice?}
		 */
		this.activeDraggingPointer = null;

		/**
		 * @private
		 * @type {Set<OnDragCallback>}
		 */
		this.onDragCbs = new Set();

		/** @type {Set<import("../../math/types.js").RaycastShape>} */
		this.shapes = new Set();
	}

	get isHovering() {
		return this._isHovering;
	}

	/**
	 * @param {import("../../Components/builtIn/CameraComponent.js").CameraComponent} camera
	 */
	getScreenPos(camera) {
		return camera.worldToScreenPos(this.entity.pos);
	}

	/**
	 * @param {import("../../math/types.js").RaycastShape} shape
	 */
	addRaycastShape(shape) {
		this.shapes.add(shape);
	}

	/**
	 * @param {import("../../math/Vec3.js").Vec3} start
	 * @param {import("../../math/Vec3.js").Vec3} dir
	 */
	raycast(start, dir) {
		const mat = this.entity.worldMatrix.inverse();
		start = start.clone().multiply(mat);

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
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerDevice} pointerDevice
	 */
	pointerOver(pointerDevice) {
		this._hoveringPointers.add(pointerDevice);
		this._updateIsHovering();
	}

	/**
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerDevice} pointerDevice
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
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerDevice} pointerDevice
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerEventData} eventData
	 */
	pointerDown(pointerDevice, eventData) {
		if (this.activeDraggingPointer) return;

		this.activeDraggingPointer = pointerDevice;
		this.handlePointerDown(pointerDevice, eventData);
	}

	/**
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerDevice} pointerDevice
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerEventData} eventData
	 */
	handlePointerDown(pointerDevice, eventData) {}

	/**
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerDevice} pointerDevice
	 */
	pointerUp(pointerDevice) {
		if (this.activeDraggingPointer != pointerDevice) return;

		this.activeDraggingPointer = null;
		this.handlePointerUp(pointerDevice);
	}

	/**
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerDevice} pointerDevice
	 */
	handlePointerUp(pointerDevice) {}

	/**
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerDevice} pointerDevice
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerEventData} eventData
	 */
	pointerMove(pointerDevice, eventData) {
		if (this.activeDraggingPointer != pointerDevice) return;

		this.handlePointerMove(pointerDevice, eventData);
	}

	/**
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerDevice} pointerDevice
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerEventData} eventData
	 */
	handlePointerMove(pointerDevice, eventData) {}

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
	 * @param {OnDragCallback} cb
	 */
	onDrag(cb) {
		this.onDragCbs.add(cb);
	}

	/**
	 * @param {OnDragCallback} cb
	 */
	removeOnDrag(cb) {
		this.onDragCbs.delete(cb);
	}

	/**
	 * @param {TDragEvent} event
	 */
	fireDragCallbacks(event) {
		this.onDragCbs.forEach(cb => cb(event));
	}
}
