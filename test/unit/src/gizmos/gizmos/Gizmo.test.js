import {assertEquals, assertStrictEquals} from "asserts";
import {Entity, Gizmo} from "../../../../../src/mod.js";

function createFakeGizmoManager() {
	/** @type {Gizmo[]} */
	const needsRenderCalls = [];
	const gizmoManager = /** @type {import("../../../../../src/mod.js").GizmoManager} */ ({
		gizmoNeedsRender(gizmo) {
			needsRenderCalls.push(gizmo);
		},
	});
	return {
		gizmoManager,
		needsRenderCalls,
	};
}
class ExtendedGizmo extends Gizmo {

}

Deno.test({
	name: "entity has the name of the class",
	fn() {
		const {gizmoManager} = createFakeGizmoManager();
		const gizmo = new ExtendedGizmo(gizmoManager);

		assertEquals(gizmo.entity.name, "gizmo (ExtendedGizmo)");
	},
});

Deno.test({
	name: "destructor removes entity from parent",
	fn() {
		const {gizmoManager} = createFakeGizmoManager();
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
		const {gizmoManager, needsRenderCalls} = createFakeGizmoManager();
		const gizmo = new ExtendedGizmo(gizmoManager);

		gizmo.gizmoNeedsRender();

		assertEquals(needsRenderCalls.length, 1);
		assertStrictEquals(needsRenderCalls[0], gizmo);
	},
});
