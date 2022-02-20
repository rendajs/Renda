import {Entity} from "../core/Entity.js";
import {ENGINE_ASSETS_LIVE_UPDATES_SUPPORT} from "../engineDefines.js";
import {MoveGizmoDraggable} from "./draggables/MoveGizmoDraggable.js";
import {GizmoPointerDevice} from "./GizmoPointerDevice.js";
import {ListeningGizmoPointerElement} from "./ListeningGizmoPointerElement.js";

/** @typedef {(gizmo: import("./gizmos/Gizmo.js").Gizmo) => void} OnGizmoNeedsRenderCb */

export class GizmoManager {
	/**
	 * A GizmoManager is responsible for the creation and destruction of Gizmos,
	 * as well as PointersDevices and Draggables. To use, create a new GizmoManager and
	 * add its entity to a scene.
	 * Then use `addGizmo` to create new Gizmos, and `requestPointerDevice` to
	 * create a a PointerDevice that you can use to interact with the Gizmos.
	 *
	 * @param {import("../Assets/EngineAssetsManager.js").EngineAssetsManager} engineAssetsManager
	 */
	constructor(engineAssetsManager) {
		this.entity = new Entity("gizmos");
		/**
		 * @type {Set<import("./gizmos/Gizmo.js").Gizmo>}
		 */
		this.gizmos = new Set();

		/** @type {Set<GizmoPointerDevice>} */
		this.pointerDevices = new Set();

		/** @type {Set<import("./draggables/GizmoDraggable.js").GizmoDraggable>} */
		this.draggables = new Set();

		/** @type {Set<OnGizmoNeedsRenderCb>} */
		this.onGizmoNeedsRenderCbs = new Set();

		/**
		 * A list of elements and its data for which addPointerEventListeners
		 * has been called.
		 * @type {Map<HTMLElement, ListeningGizmoPointerElement>}
		 */
		this.listeningPointerElements = new Map();

		this.billboardVertexState = null;
		this.meshVertexState = null;

		/** @type {import("../mod.js").Material?} */
		this.billboardMaterial = null;
		/** @type {import("../mod.js").Material?} */
		this.meshMaterial = null;

		engineAssetsManager.watchAsset("9d9ebd2e-c657-4252-b7af-b5889a4986c3", asset => {
			this.billboardVertexState = asset;
			this.updateGizmoMaterials();
		});
		engineAssetsManager.watchAsset("6ebfe5aa-6754-406e-a238-ec052eefa7df", asset => {
			this.billboardMaterial = asset;
			this.updateGizmoMaterials();
		});
		engineAssetsManager.watchAsset("2a5ca9e6-6790-441b-8764-a07fbb438d1a", asset => {
			this.meshVertexState = asset;
			this.updateGizmoMaterials();
		});
		engineAssetsManager.watchAsset("47f64a6d-9629-4921-8b1a-a244af1aa568", asset => {
			this.meshMaterial = asset;
			this.updateGizmoMaterials();
		});
	}

	destructor() {
		for (const gizmo of this.gizmos) {
			this.removeGizmo(gizmo);
		}
		this.entity.detachParents();
	}

	/**
	 * @template {import("./gizmos/Gizmo.js").Gizmo} T
	 * @param {new (...args: any) => T} constructor
	 * @returns {T}
	 */
	addGizmo(constructor) {
		const gizmo = new constructor(this);
		this.gizmos.add(gizmo);
		this.entity.add(gizmo.entity);
		return gizmo;
	}

	/**
	 * @param {import("./gizmos/Gizmo.js").Gizmo} gizmo
	 */
	removeGizmo(gizmo) {
		gizmo.destructor();
		this.gizmos.delete(gizmo);
	}

	updateGizmoMaterials() {
		if (!ENGINE_ASSETS_LIVE_UPDATES_SUPPORT) return;
		for (const gizmo of this.gizmos) {
			gizmo.updateMaterials();
		}
	}

	/**
	 * Creates a new Pointer Device that you can use for interacting with
	 * Draggables. A single pointer device can only be used for one Draggable at
	 * a time. So if you have input hardware with capabilities of multiple
	 * simultaneous pointers, you should create multiple Pointer Devices.
	 * This way users can hover/drag multiple objects at once.
	 */
	requestPointerDevice() {
		const device = new GizmoPointerDevice(this);
		this.pointerDevices.add(device);
		return device;
	}

	/**
	 * @param {GizmoPointerDevice} device
	 */
	destroyPointerDevice(device) {
		this.pointerDevices.delete(device);
		device.destructor();
	}

	/**
	 * @template {import("./draggables/GizmoDraggable.js").GizmoDraggableType} [T = "move"]
	 * @param {T} draggableType
	 */
	createDraggable(draggableType) {
		let draggable;
		if (draggableType == "move") {
			draggable = new MoveGizmoDraggable(this);
		} else {
			throw new Error(`Unknown draggable type: ${draggableType}`);
		}
		this.draggables.add(draggable);
		return /** @type {import("./draggables/GizmoDraggable.js").GetGizmoDraggableType<T>} */ (draggable);
	}

	/**
	 * @param {import("../components/builtIn/CameraComponent.js").CameraComponent} camera
	 * @param {import("../math/Vec3.js").Vec3Parameters} screenPos
	 */
	raycastDraggables(camera, ...screenPos) {
		const {start, dir} = camera.getRaycastRayFromScreenPos(...screenPos);
		let closestDist = Infinity;
		let closestDraggable = null;
		for (const draggable of this.draggables) {
			const result = draggable.raycast(start, dir);
			if (result && result.dist < closestDist) {
				closestDist = result.dist;
				closestDraggable = draggable;
			}
		}
		return closestDraggable;
	}

	/**
	 * Adds the required event listeners to the given element.
	 * This removes the need for a lot of boilerplate code in your application.
	 * However, you'll need to implement this yourself if you want to use the
	 * events yourself in more complex ways, such as extra raycasts for clicking
	 * other (non-gizmo) objects, and you want more fine grained control over
	 * when events fire on the gizmomanager.
	 *
	 * Be sure to call {@linkcode removePointerEventListeners} when you remove
	 * the element from the dom. Otherwise some gizmos might stay stuck in the
	 * hovering or dragging state.
	 *
	 * @param {HTMLElement} element
	 * @param {import("../components/builtIn/CameraComponent.js").CameraComponent} camera
	 */
	addPointerEventListeners(element, camera, addEvents = true) {
		if (this.listeningPointerElements.has(element)) {
			throw new Error("Element is already listening for pointer events");
		}
		const listeningElement = new ListeningGizmoPointerElement(this, element, camera);
		this.listeningPointerElements.set(element, listeningElement);
		if (addEvents) listeningElement.addEventListeners();
		return listeningElement;
	}

	/**
	 * @param {HTMLElement} element
	 */
	removePointerEventListeners(element) {
		const pointerElement = this.listeningPointerElements.get(element);
		this.listeningPointerElements.delete(element);
		if (!pointerElement) return;
		pointerElement.removeEventListeners();
	}

	/**
	 * @param {import("./gizmos/Gizmo.js").Gizmo} gizmo
	 */
	gizmoNeedsRender(gizmo) {
		this.onGizmoNeedsRenderCbs.forEach(cb => cb(gizmo));
	}

	/**
	 * @param {OnGizmoNeedsRenderCb} cb
	 */
	onGizmoNeedsRender(cb) {
		this.onGizmoNeedsRenderCbs.add(cb);
	}

	/**
	 * @param {OnGizmoNeedsRenderCb} cb
	 */
	removeOnGizmoNeedsRender(cb) {
		this.onGizmoNeedsRenderCbs.delete(cb);
	}
}
