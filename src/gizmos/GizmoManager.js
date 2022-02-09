import {Entity} from "../core/Entity.js";
import {ENGINE_ASSETS_LIVE_UPDATES_SUPPORT} from "../engineDefines.js";
import {GizmoDraggable} from "./GizmoDraggable.js";
import {GizmoPointerDevice} from "./GizmoPointerDevice.js";

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

		/** @type {Set<import("./GizmoDraggable.js").GizmoDraggable>} */
		this.draggables = new Set();

		this.billboardVertexState = null;
		this.meshVertexState = null;

		this.billboardMaterial = null;
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

	createDraggable() {
		const draggable = new GizmoDraggable(this);
		this.draggables.add(draggable);
		return draggable;
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
}
