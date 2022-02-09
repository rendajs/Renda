import {GizmoManager} from "../../../../src/gizmos/GizmoManager.js";
import {CameraComponent, Sphere} from "../../../../src/mod.js";
import {Entity} from "../../../../src/core/Entity.js";

export class FakeEngineAssetsManager {
	/**
	 * @param {string} id
	 * @param {import("../../../../src/Assets/EngineAssetsManager.js").WatchAssetCallback} callback
	 */
	watchAsset(id, callback) {
		callback(null);
	}
}

export function getFakeEngineAssetsManager() {
	const fakeEngineAssetsManager = new FakeEngineAssetsManager();
	return /** @type {import("../../../../src/Assets/EngineAssetsManager.js").EngineAssetsManager} */ (fakeEngineAssetsManager);
}

export class FakeGizmo {
	/**
	 * @param {GizmoManager} gizmoManager
	 */
	constructor(gizmoManager) {
		this.gizmoManager = gizmoManager;
		this.entity = new Entity();
		this.destructorCalled = false;
	}

	destructor() {
		this.destructorCalled = true;
	}
}
const Gizmo = /** @type {any} */(FakeGizmo);
export {Gizmo};

export function initBasicSetup() {
	const cameraObject = new Entity();
	cameraObject.pos.set(-2, 0.7, -2);
	cameraObject.rot.setFromAxisAngle(0.2, 0.7, -0.1);
	const cam = cameraObject.addComponent(CameraComponent);

	const manager = new GizmoManager(getFakeEngineAssetsManager());
	const draggable = manager.createDraggable();
	const sphere = new Sphere();
	draggable.addRaycastShape(sphere);
	return {manager, draggable, cam};
}
