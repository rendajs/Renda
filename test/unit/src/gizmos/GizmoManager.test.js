import {assert, assertEquals, assertStrictEquals} from "asserts";
import {GizmoManager} from "../../../../src/gizmos/GizmoManager.js";
import {Entity} from "../../../../src/core/Entity.js";

class FakeEngineAssetsManager {
	/**
	 * @param {string} id
	 * @param {import("../../../../src/Assets/EngineAssetsManager.js").WatchAssetCallback} callback
	 */
	watchAsset(id, callback) {
		callback(null);
	}
}
const fakeEngineAssetsManager = /** @type {import("../../../../src/Assets/EngineAssetsManager.js").EngineAssetsManager} */ (new FakeEngineAssetsManager());

class FakeGizmo {
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

class ExtendedGizmo extends Gizmo {
}

Deno.test({
	name: "Adding a gizmo",
	fn: () => {
		const manager = new GizmoManager(fakeEngineAssetsManager);
		const gizmo = manager.addGizmo(ExtendedGizmo);

		assert(gizmo instanceof ExtendedGizmo, "gizmo is not an instance of ExtendedGizmo");
		assertStrictEquals(gizmo.entity.parent, manager.entity);
		assertEquals(manager.gizmos.size, 1);
	},
});

Deno.test({
	name: "Removing a gizmo",
	fn: () => {
		const manager = new GizmoManager(fakeEngineAssetsManager);
		const gizmo = manager.addGizmo(ExtendedGizmo);
		manager.removeGizmo(gizmo);

		const castGizmo = /** @type {FakeGizmo} */(gizmo);
		assertEquals(castGizmo.destructorCalled, true);
		assertEquals(manager.gizmos.size, 0);
	},
});

Deno.test({
	name: "Destructor should remove all gizmos",
	fn: () => {
		const manager = new GizmoManager(fakeEngineAssetsManager);
		const gizmo1 = manager.addGizmo(ExtendedGizmo);
		const gizmo2 = manager.addGizmo(ExtendedGizmo);

		manager.destructor();

		const castGizmo1 = /** @type {FakeGizmo} */(gizmo1);
		assertEquals(castGizmo1.destructorCalled, true);
		const castGizmo2 = /** @type {FakeGizmo} */(gizmo2);
		assertEquals(castGizmo2.destructorCalled, true);
		assertEquals(manager.gizmos.size, 0);
	},
});
