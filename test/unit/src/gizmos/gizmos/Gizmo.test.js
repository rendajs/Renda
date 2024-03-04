import { assertEquals, assertStrictEquals } from "std/testing/asserts.ts";
import { Entity, Gizmo, Vec3 } from "../../../../../src/mod.js";
import { assertVecAlmostEquals } from "../../../shared/asserts.js";
import { createFakeGizmoManager } from "../shared.js";

class ExtendedGizmo extends Gizmo {

}

Deno.test({
	name: "entity has the name of the class",
	fn() {
		const { gizmoManager } = createFakeGizmoManager();
		const gizmo = new ExtendedGizmo(gizmoManager);

		assertEquals(gizmo.entity.name, "Gizmo (ExtendedGizmo)");
	},
});

Deno.test({
	name: "destructor removes entity from parent",
	fn() {
		const { gizmoManager } = createFakeGizmoManager();
		const gizmo = new ExtendedGizmo(gizmoManager);
		const parent = new Entity("parent");
		parent.add(gizmo.entity);

		gizmo.destructor();

		assertEquals(parent.children.length, 0);
	},
});

Deno.test({
	name: "gizmoNeedsRender notifies the gizmo manager",
	fn() {
		const { gizmoManager, needsRenderCalls } = createFakeGizmoManager();
		const gizmo = new ExtendedGizmo(gizmoManager);

		gizmo.gizmoNeedsRender();

		assertEquals(needsRenderCalls.length, 1);
		assertStrictEquals(needsRenderCalls[0], gizmo);
	},
});

Deno.test({
	name: "modifying gizmo pos changes the entity position",
	fn() {
		const { gizmoManager } = createFakeGizmoManager();
		const gizmo = new ExtendedGizmo(gizmoManager);

		gizmo.pos.set(1, 2, 3);

		assertVecAlmostEquals(gizmo.entity.pos, [1, 2, 3]);
		assertVecAlmostEquals(gizmo.pos, [1, 2, 3]);
	},
});

Deno.test({
	name: "setting gizmo pos changes the entity position",
	fn() {
		const { gizmoManager } = createFakeGizmoManager();
		const gizmo = new ExtendedGizmo(gizmoManager);

		gizmo.pos = new Vec3(1, 2, 3);

		assertVecAlmostEquals(gizmo.entity.pos, [1, 2, 3]);
		assertVecAlmostEquals(gizmo.pos, [1, 2, 3]);
	},
});
