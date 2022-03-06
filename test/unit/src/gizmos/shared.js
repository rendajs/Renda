import {GizmoManager} from "../../../../src/gizmos/GizmoManager.js";
import {CameraComponent, Material, Sphere, Vec3, VertexState} from "../../../../src/mod.js";
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
	const draggable = manager.createDraggable("move");
	const sphere = new Sphere();
	draggable.addRaycastShape(sphere);
	return {manager, draggable, cam};
}

export function createFakeGizmoManager({
	initEngineAssets = true,
} = {}) {
	/** @typedef {import("../../../../src/gizmos/draggables/GizmoDraggable.js").OnIsHoveringChangeCb} OnIsHoveringChangeCb */
	/** @typedef {(event: unknown) => void} OnDragCallback */

	class FakeGizmoDraggable {
		/**
		 * @param {string} type
		 */
		constructor(type) {
			this.type = type;
			/** @type {Set<OnIsHoveringChangeCb>} */
			this.onIsHoveringChangeCbs = new Set();
			/** @type {Set<OnDragCallback>} */
			this.onDragCbs = new Set();

			this.axis = new Vec3();
			this.entity = new Entity();
		}

		addRaycastShape() {}

		/**
		 * @param {OnIsHoveringChangeCb} cb
		 */
		onIsHoveringChange(cb) {
			this.onIsHoveringChangeCbs.add(cb);
		}

		/**
		 * @param {boolean} isHovering
		 */
		fireIsHoveringChange(isHovering) {
			this.onIsHoveringChangeCbs.forEach(cb => cb(isHovering));
		}

		/**
		 * @param {OnDragCallback} cb
		 */
		onDrag(cb) {
			this.onDragCbs.add(cb);
		}

		/**
		 * @param {unknown} event
		 */
		fireOnDrag(event) {
			this.onDragCbs.forEach(cb => cb(event));
		}
	}

	/** @type {import("../../../../src/mod.js").Gizmo[]} */
	const needsRenderCalls = [];
	/** @type {FakeGizmoDraggable[]} */
	const createdDraggables = [];
	const gizmoManager = /** @type {import("../../../../src/mod.js").GizmoManager} */ ({
		gizmoNeedsRender(gizmo) {
			needsRenderCalls.push(gizmo);
		},
		createDraggable(type) {
			const mockDraggable = new FakeGizmoDraggable(type);
			createdDraggables.push(mockDraggable);
			return mockDraggable;
		},
		billboardVertexState: null,
		meshVertexState: null,
		billboardMaterial: null,
		meshMaterial: null,
	});

	function doInitEngineAssets() {
		gizmoManager.billboardVertexState = new VertexState();
		gizmoManager.meshVertexState = new VertexState();
		gizmoManager.billboardMaterial = new Material();
		gizmoManager.meshMaterial = new Material();
	}

	if (initEngineAssets) doInitEngineAssets();

	return {
		gizmoManager,
		needsRenderCalls,
		createdDraggables,
		initEngineAssets: doInitEngineAssets,
	};
}
