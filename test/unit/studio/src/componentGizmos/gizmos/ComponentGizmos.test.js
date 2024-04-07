import { assertEquals, assertStrictEquals } from "std/testing/asserts.ts";
import { ComponentGizmos } from "../../../../../../studio/src/componentGizmos/gizmos/ComponentGizmos.js";
import { Gizmo } from "../../../../../../src/mod.js";

const mockStudio = /** @type {import("../../../../../../studio/src/Studio.js").Studio} */ ({});
const mockComponent = /** @type {import("../../../../../../src/mod.js").Component} */ ({});
function getMockGizmoManager() {
	/** @type {unknown[]} */
	const addGizmoCalls = [];
	/** @type {unknown[]} */
	const removeGizmoCalls = [];
	const mockGizmoManager = /** @type {import("../../../../../../src/mod.js").GizmoManager} */ ({
		addGizmo(gizmo) {
			addGizmoCalls.push(gizmo);
			return /** @type {import("../../../../../../src/gizmos/gizmos/Gizmo.js").Gizmo} */ ({});
		},
		removeGizmo(gizmo) {
			removeGizmoCalls.push(gizmo);
		},
	});
	return {
		mockGizmoManager,
		addGizmoCalls,
		removeGizmoCalls,
	};
}

class ExtendedGizmo extends Gizmo {}

/**
 * @extends {ComponentGizmos<typeof mockComponent, [ExtendedGizmo]>}
 */
class ExtendedComponentGizmos extends ComponentGizmos {
	static requiredGizmos = [ExtendedGizmo];
}

Deno.test({
	name: "creating a ComponentGizmos instance automatically creates the required gizmos",
	fn() {
		const { mockGizmoManager, addGizmoCalls } = getMockGizmoManager();
		const componentGizmos = new ExtendedComponentGizmos(mockStudio, mockComponent, mockGizmoManager);

		assertEquals(componentGizmos.createdGizmos.length, 1);
		assertEquals(addGizmoCalls.length, 1);
		assertStrictEquals(addGizmoCalls[0], ExtendedGizmo);
	},
});

Deno.test({
	name: "destructor removes the created gizmos from the manager",
	fn() {
		const { mockGizmoManager, removeGizmoCalls } = getMockGizmoManager();
		const componentGizmos = new ExtendedComponentGizmos(mockStudio, mockComponent, mockGizmoManager);

		componentGizmos.destructor();

		assertEquals(removeGizmoCalls.length, 1);
	},
});
