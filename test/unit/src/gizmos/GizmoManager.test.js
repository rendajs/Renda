import {assert, assertEquals, assertExists, assertStrictEquals} from "asserts";
import {GizmoManager} from "../../../../src/gizmos/GizmoManager.js";
import {Gizmo, getFakeEngineAssetsManager, initBasicSetup} from "./shared.js";

class ExtendedGizmo extends Gizmo {
}

Deno.test({
	name: "Adding a gizmo",
	fn: () => {
		const manager = new GizmoManager(getFakeEngineAssetsManager());
		const gizmo = manager.addGizmo(ExtendedGizmo);

		assert(gizmo instanceof ExtendedGizmo, "gizmo is not an instance of ExtendedGizmo");
		assertStrictEquals(gizmo.entity.parent, manager.entity);
		assertEquals(manager.gizmos.size, 1);
	},
});

Deno.test({
	name: "Removing a gizmo",
	fn: () => {
		const manager = new GizmoManager(getFakeEngineAssetsManager());
		const gizmo = manager.addGizmo(ExtendedGizmo);
		manager.removeGizmo(gizmo);

		const castGizmo = /** @type {import("./shared.js").FakeGizmo} */(gizmo);
		assertEquals(castGizmo.destructorCalled, true);
		assertEquals(manager.gizmos.size, 0);
	},
});

Deno.test({
	name: "Destructor should remove all gizmos",
	fn() {
		const manager = new GizmoManager(getFakeEngineAssetsManager());
		const gizmo1 = manager.addGizmo(ExtendedGizmo);
		const gizmo2 = manager.addGizmo(ExtendedGizmo);

		manager.destructor();

		const castGizmo1 = /** @type {import("./shared.js").FakeGizmo} */(gizmo1);
		assertEquals(castGizmo1.destructorCalled, true);
		const castGizmo2 = /** @type {import("./shared.js").FakeGizmo} */(gizmo2);
		assertEquals(castGizmo2.destructorCalled, true);
		assertEquals(manager.gizmos.size, 0);
	},
});

Deno.test({
	name: "raycastDraggables()",
	fn() {
		const {manager, draggable, cam} = initBasicSetup();
		const screenPos = draggable.getScreenPos(cam);

		const hit = manager.raycastDraggables(cam, screenPos);

		assertExists(hit);
	},
});

Deno.test({
	name: "requestPointerDevice()",
	fn() {
		const {manager} = initBasicSetup();
		const pointer = manager.requestPointerDevice();

		assertExists(pointer);
		assertEquals(manager.pointerDevices.size, 1);
	},
});

Deno.test({
	name: "destroyPointerDevice()",
	fn() {
		const {manager} = initBasicSetup();
		const pointer = manager.requestPointerDevice();
		manager.destroyPointerDevice(pointer);

		assertEquals(manager.pointerDevices.size, 0);
	},
});
