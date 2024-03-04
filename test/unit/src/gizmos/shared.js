import { GizmoManager } from "../../../../src/gizmos/GizmoManager.js";
import { CameraComponent, Material, Sphere, Vec3, VertexState } from "../../../../src/mod.js";
import { Entity } from "../../../../src/core/Entity.js";
import { spy } from "std/testing/mock.ts";

export class FakeEngineAssetsManager {
	/**
	 * @param {string} id
	 * @param {import("../../../../src/assets/AssetLoader.js").AssetLoaderGetAssetOptions<any>} options
	 * @param {import("../../../../src/assets/EngineAssetsManager.js").WatchAssetCallback<any>} callback
	 */
	watchAsset(id, options, callback) {
		callback(null);
	}
}

export function getFakeEngineAssetsManager() {
	const fakeEngineAssetsManager = new FakeEngineAssetsManager();
	return /** @type {import("../../../../src/assets/EngineAssetsManager.js").EngineAssetsManager} */ (fakeEngineAssetsManager);
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
export { Gizmo };

export function initBasicSetup() {
	const cameraObject = new Entity();
	cameraObject.pos.set(-2, 0.7, 10);
	cameraObject.rot.setFromAxisAngle(0.2, 0.7, -0.1);
	const cam = cameraObject.addComponent(CameraComponent);

	const manager = new GizmoManager(getFakeEngineAssetsManager());
	const draggable = manager.createDraggable("move");
	const sphere = new Sphere();
	draggable.addRaycastShape(sphere);
	return { manager, draggable, cam };
}

/**
 * @template [TDragEvent = unknown]
 */
export class FakeGizmoDraggable {
	/** @typedef {import("../../../../src/gizmos/draggables/GizmoDraggable.js").OnIsHoveringChangeCb} OnIsHoveringChangeCb */
	/** @typedef {(event: TDragEvent) => void} OnDragCallback */

	/** @type {Set<OnDragCallback>} */
	#onDragCbs = new Set();
	/** @type {Set<() => void>} */
	#onDragEndCbs = new Set();

	/**
	 * @param {string} type
	 */
	constructor(type) {
		this.type = type;
		/** @type {Set<OnIsHoveringChangeCb>} */
		this.onIsHoveringChangeCbs = new Set();

		this.axis = new Vec3();
		this.entity = new Entity("Fake draggable " + type);
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
		this.#onDragCbs.add(cb);
	}

	/**
	 * @param {TDragEvent} event
	 */
	fireOnDrag(event) {
		this.#onDragCbs.forEach(cb => cb(event));
	}

	/**
	 * @param {() => void} cb
	 */
	onDragEnd(cb) {
		this.#onDragEndCbs.add(cb);
	}

	fireOnDragEnd() {
		this.#onDragEndCbs.forEach(cb => cb());
	}
}

export function createFakeGizmoManager({
	initEngineAssets = true,
} = {}) {
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
		removeDraggable(draggable) {},
		billboardVertexState: null,
		meshVertexState: null,
		billboardMaterial: null,
		meshMaterial: null,
	});

	/** @type {import("std/testing/mock.ts").Spy<Material, [], Material>?} */
	let billboardMaterialCloneSpy = null;
	/** @type {import("std/testing/mock.ts").Spy<Material, [], Material>?} */
	let meshMaterialCloneSpy = null;
	function doInitEngineAssets() {
		gizmoManager.billboardVertexState = new VertexState();
		gizmoManager.meshVertexState = new VertexState();
		gizmoManager.billboardMaterial = new Material();
		billboardMaterialCloneSpy = spy(gizmoManager.billboardMaterial, "clone");
		gizmoManager.meshMaterial = new Material();
		meshMaterialCloneSpy = spy(gizmoManager.meshMaterial, "clone");
	}

	if (initEngineAssets) doInitEngineAssets();

	return {
		gizmoManager,
		needsRenderCalls,
		createdDraggables,
		initEngineAssets: doInitEngineAssets,
		/**
		 * @param {number} cloneCallIndex
		 */
		getBillboardMaterial(cloneCallIndex) {
			if (!billboardMaterialCloneSpy) {
				throw new Error("Failed to get billboard material clone, no clone spy set");
			}
			const call = billboardMaterialCloneSpy.calls.at(cloneCallIndex);
			if (!call) {
				throw new Error(`Failed to get billboard material clone, no clone call with index ${cloneCallIndex} exists.`);
			}
			const clone = call.returned;
			if (!clone) {
				throw new Error("Clone call returned nothing");
			}
			return clone;
		},
		/**
		 * @param {number} cloneCallIndex
		 */
		getMeshMaterial(cloneCallIndex) {
			if (!meshMaterialCloneSpy) {
				throw new Error("Failed to get mesh material clone, no clone spy set");
			}
			const call = meshMaterialCloneSpy.calls.at(cloneCallIndex);
			if (!call) {
				throw new Error(`Failed to get mesh material clone, no clone call with index ${cloneCallIndex} exists.`);
			}
			const clone = call.returned;
			if (!clone) {
				throw new Error("Clone call returned nothing");
			}
			return clone;
		},
	};
}
