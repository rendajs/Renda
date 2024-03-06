import { assertEquals, assertStrictEquals } from "std/testing/asserts.ts";
import { IconGizmo, VertexState } from "../../../../../src/mod.js";

Deno.test({
	name: "billboardVertexState from gizmomanager is used",
	fn() {
		const mockGizmoManager = /** @type {import("../../../../../src/gizmos/GizmoManager.js").GizmoManager} */ ({
			billboardVertexState: new VertexState(),
		});
		const gizmo = new IconGizmo(mockGizmoManager);
		assertStrictEquals(gizmo.mesh.vertexState, mockGizmoManager.billboardVertexState);
	},
});

Deno.test({
	name: "Works when billboardVertexState is not available yet",
	fn() {
		const mockGizmoManager = /** @type {import("../../../../../src/gizmos/GizmoManager.js").GizmoManager} */ ({
			billboardVertexState: null,
		});
		const gizmo = new IconGizmo(mockGizmoManager);
		gizmo.addCircle(10, 1);
		gizmo.updateMesh();
	},
});

Deno.test({
	name: "addCircle adds a circle",
	fn() {
		const mockGizmoManager = /** @type {import("../../../../../src/gizmos/GizmoManager.js").GizmoManager} */ ({});
		const gizmo = new IconGizmo(mockGizmoManager);
		gizmo.addCircle(10, 1);
		gizmo.updateMesh();
		assertEquals(gizmo.mesh.vertexCount, 10);
	},
});
