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
 * @property {import("./RotateAxisGizmoDraggable.js").RotateAxisGizmoDraggable} rotate-axis
 * @property {import("./ScaleGizmoDraggable.js").ScaleGizmoDraggable} scale
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

	/** @type {import("../GizmoPointerDevice.js").GizmoPointerDevice?} */
	#activeDraggingPointer = null;

	/** @type {Set<OnDragCallback>} */
	#onDragCbs = new Set();
	/** @type {Set<() => void>} */
	#onDragEndCbs = new Set();

	/** @type {Set<OnIsHoveringChangeCb>} */
	#onIsHoveringChangeCbs = new Set();

	#isHovering = false;

	/** @type {Set<import("../GizmoPointerDevice.js").GizmoPointerDevice>} */
	#hoveringPointers = new Set();

	/**
	 * A draggable is something that can be requested from the gizmo manager.
	 * Usually this is done by gizmos, but you can also request them directly.
	 * Draggables handle events from pointer devices such as hovering or dragging.
	 * @param {import("../GizmoManager.js").GizmoManager} gizmoManager
	 */
	constructor(gizmoManager) {
		this.gizmoManager = gizmoManager;

		this.entity = new Entity("GizmoDraggable (" + this.constructor.name + ")");

		/** @type {Set<import("../../math/types.ts").RaycastShape>} */
		this.shapes = new Set();
	}

	get isHovering() {
		return this.#isHovering;
	}

	/**
	 * @param {import("../../components/builtIn/CameraComponent.js").CameraComponent} camera
	 */
	getScreenPos(camera) {
		return camera.worldToScreenPos(this.entity.pos);
	}

	/**
	 * @param {import("../../math/types.ts").RaycastShape} shape
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
		const startDir = start.clone().add(dir).multiply(mat);
		const localStart = start.clone().multiply(mat);
		const localDir = startDir.sub(localStart);

		let closestResult = null;
		let closestDist = Infinity;
		for (const shape of this.shapes) {
			const result = shape.raycast(localStart, localDir);
			if (result) {
				if (result.dist < closestDist) {
					closestDist = result.dist;
					closestResult = result;
				}
			}
		}

		// Convert the result back to world space
		if (closestResult) {
			const pos = closestResult.pos.multiply(this.entity.worldMatrix);
			/** @type {import("../../math/types.ts").RaycastResult} */
			const result = {
				pos,
				dist: pos.distanceTo(start),
			};
			return result;
		} else {
			return null;
		}
	}

	/**
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerDevice} pointerDevice
	 */
	pointerOver(pointerDevice) {
		this.#hoveringPointers.add(pointerDevice);
		this.#updateIsHovering();
	}

	/**
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerDevice} pointerDevice
	 */
	pointerOut(pointerDevice) {
		this.#hoveringPointers.delete(pointerDevice);
		this.#updateIsHovering();
	}

	#updateIsHovering() {
		const isHovering = this.#hoveringPointers.size > 0;
		if (isHovering != this.#isHovering) {
			this.#isHovering = isHovering;
			this.#onIsHoveringChangeCbs.forEach(cb => cb(isHovering));
		}
	}

	/**
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerDevice} pointerDevice
	 * @param {import("../GizmoPointerDevice.js").GizmoPointerEventData} eventData
	 */
	pointerDown(pointerDevice, eventData) {
		if (this.#activeDraggingPointer) return;

		this.#activeDraggingPointer = pointerDevice;
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
		if (this.#activeDraggingPointer != pointerDevice) return;

		this.#activeDraggingPointer = null;
		this.#onDragEndCbs.forEach(cb => cb());
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
		if (this.#activeDraggingPointer != pointerDevice) return;

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
		this.#onIsHoveringChangeCbs.add(cb);
	}

	/**
	 * @param {OnIsHoveringChangeCb} cb
	 */
	removeOnIsHoveringChange(cb) {
		this.#onIsHoveringChangeCbs.delete(cb);
	}

	/**
	 * @param {OnDragCallback} cb
	 */
	onDrag(cb) {
		this.#onDragCbs.add(cb);
	}

	/**
	 * @param {OnDragCallback} cb
	 */
	removeOnDrag(cb) {
		this.#onDragCbs.delete(cb);
	}

	/**
	 * @param {TDragEvent} event
	 */
	fireDragCallbacks(event) {
		this.#onDragCbs.forEach(cb => cb(event));
	}

	/**
	 * @param {() => void} cb
	 */
	onDragEnd(cb) {
		this.#onDragEndCbs.add(cb);
	}

	/**
	 * @param {() => void} cb
	 */
	removeOnDragEnd(cb) {
		this.#onDragEndCbs.delete(cb);
	}
}
