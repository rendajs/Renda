import { assertEquals, assertExists } from "std/testing/asserts.ts";
import { assertSpyCalls, spy } from "std/testing/mock.ts";
import { Entity, Quat, RotationGizmo, Vec3 } from "../../../../../src/mod.js";
import { assertQuatAlmostEquals, assertVecAlmostEquals } from "../../../shared/asserts.js";
import { createFakeGizmoManager } from "../shared.js";

/**
 * @param  {Parameters<typeof createFakeGizmoManager>} opts
 */
function basicSetup(...opts) {
	const data = createFakeGizmoManager(...opts);
	const rotationGizmo = new RotationGizmo(data.gizmoManager);

	return {
		...data,
		rotationGizmo,
	};
}

Deno.test({
	name: "Materials get applied when they load via the engine assets manager",
	fn() {
		const { rotationGizmo, initEngineAssets } = basicSetup({ initEngineAssets: false });

		assertEquals(rotationGizmo.circleMesh.vertexState, null);
		assertEquals(rotationGizmo.circleMesh.vertexState, null);
		assertEquals(rotationGizmo.createdCircles[0].meshComponent.materials, []);
		assertEquals(rotationGizmo.createdCircles[1].meshComponent.materials, []);
		assertEquals(rotationGizmo.createdCircles[2].meshComponent.materials, []);

		initEngineAssets();
		rotationGizmo.updateAssets();

		assertExists(rotationGizmo.circleMesh.vertexState);
		assertExists(rotationGizmo.circleMesh.vertexState);
		assertEquals(rotationGizmo.createdCircles[0].meshComponent.materials.length, 1);
		assertEquals(rotationGizmo.createdCircles[1].meshComponent.materials.length, 1);
		assertEquals(rotationGizmo.createdCircles[2].meshComponent.materials.length, 1);
	},
});

Deno.test({
	name: "destructor removes entity from parent",
	fn() {
		const { rotationGizmo } = basicSetup();
		const parent = new Entity("parent");
		parent.add(rotationGizmo.entity);

		rotationGizmo.destructor();

		assertEquals(parent.children.length, 0);
	},
});

Deno.test({
	name: "default material colors are correct",
	fn() {
		const { rotationGizmo } = basicSetup();

		assertVecAlmostEquals(rotationGizmo.createdCircles[0].colorInstance, new Vec3(1, 0.15, 0.15));
		assertVecAlmostEquals(rotationGizmo.createdCircles[1].colorInstance, new Vec3(0.2, 1, 0.2));
		assertVecAlmostEquals(rotationGizmo.createdCircles[2].colorInstance, new Vec3(0.3, 0.3, 1));
	},
});

Deno.test({
	name: "hovering over a draggable shows hover feedback",
	fn() {
		const { rotationGizmo, createdDraggables } = basicSetup();
		const circleMesh = rotationGizmo.createdCircles[0].meshComponent;
		const xDraggable = createdDraggables[0];

		const material1 = circleMesh.materials[0];
		assertExists(material1);
		const color1 = material1.getProperty("colorMultiplier");
		assertVecAlmostEquals(color1, [1, 0.15, 0.15]);

		xDraggable.fireIsHoveringChange(true);

		const material2 = circleMesh.materials[0];
		assertExists(material2);
		const color2 = material2.getProperty("colorMultiplier");
		assertVecAlmostEquals(color2, [1, 0.7, 0]);

		xDraggable.fireIsHoveringChange(false);

		const material3 = circleMesh.materials[0];
		assertExists(material3);
		const color3 = material3.getProperty("colorMultiplier");
		assertVecAlmostEquals(color3, [1, 0.15, 0.15]);
	},
});

Deno.test({
	name: "dragging the axis draggables updates the gizmo rotation and fires events",
	fn() {
		const { rotationGizmo, createdDraggables } = basicSetup();

		/** @type {import("../../../../../src/gizmos/gizmos/RotationGizmo.js").RotationGizmoDragCallback} */
		const cb = (e) => {};
		const cbSpy = spy(cb);
		rotationGizmo.onDrag(cbSpy);

		/** @type {import("../shared.js").FakeGizmoDraggable<import("../../../../../src/gizmos/draggables/RotateAxisGizmoDraggable.js").RotateAxisGizmoDragEvent>} */
		const xDraggable = createdDraggables[0];

		assertQuatAlmostEquals(rotationGizmo.rot, Quat.identity);

		xDraggable.fireOnDrag({
			localDelta: Math.PI * 0.5,
			worldDelta: Quat.fromAxisAngle(1, 0, 0, Math.PI * 0.5),
		});

		assertQuatAlmostEquals(rotationGizmo.rot, Quat.fromAxisAngle(1, 0, 0, Math.PI * 0.5));

		assertSpyCalls(cbSpy, 1);
		assertQuatAlmostEquals(cbSpy.calls[0].args[0].localDelta, Quat.fromAxisAngle(1, 0, 0, Math.PI * 0.5));
		assertQuatAlmostEquals(cbSpy.calls[0].args[0].worldDelta, Quat.fromAxisAngle(1, 0, 0, Math.PI * 0.5));
	},
});

Deno.test({
	name: "draggable positions are relative to the gizmo",
	fn() {
		const { rotationGizmo, createdDraggables } = basicSetup();

		rotationGizmo.entity.pos.set(1, 1, 1);

		assertVecAlmostEquals(createdDraggables[0].entity.worldPos, [1, 1, 1]);
		assertVecAlmostEquals(createdDraggables[1].entity.worldPos, [1, 1, 1]);
		assertVecAlmostEquals(createdDraggables[2].entity.worldPos, [1, 1, 1]);
	},
});
