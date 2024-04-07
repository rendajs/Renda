import { assertEquals, assertExists, assertInstanceOf } from "std/testing/asserts.ts";
import { assertSpyCalls, spy } from "std/testing/mock.ts";
import { Entity, MeshComponent, ScaleGizmo, Vec3 } from "../../../../../src/mod.js";
import { assertVecAlmostEquals } from "../../../../../src/util/asserts.js";
import { createFakeGizmoManager } from "../shared.js";

/**
 * @param  {Parameters<typeof createFakeGizmoManager>} opts
 */
function basicSetup(...opts) {
	const data = createFakeGizmoManager(...opts);
	const scaleGizmo = new ScaleGizmo(data.gizmoManager);

	assertEquals(scaleGizmo.entity.components.length, 1);
	const circleMeshComponent = scaleGizmo.entity.components[0];
	assertInstanceOf(circleMeshComponent, MeshComponent);

	const circleMesh = circleMeshComponent.mesh;
	assertExists(circleMesh);

	/**
	 * @param {number} index
	 */
	function getArrowMeshComponent(index) {
		const child = scaleGizmo.entity.children.at(index);
		if (!child || child.name != "Arrow") {
			throw new Error(`Failed to get arrow mesh component for index ${index}`);
		}
		const component = child.components[0];
		assertInstanceOf(component, MeshComponent);
		return component;
	}

	const xArrowMesh = getArrowMeshComponent(1);
	const yArrowMesh = getArrowMeshComponent(3);
	const zArrowMesh = getArrowMeshComponent(5);

	const arrowMesh = xArrowMesh.mesh;
	assertExists(arrowMesh);

	return {
		...data,
		scaleGizmo,
		circleMeshComponent,
		circleMesh,
		arrowMesh,
		xArrowMesh,
		yArrowMesh,
		zArrowMesh,
	};
}

Deno.test({
	name: "Materials get applied when they load via the engine assets manager",
	fn() {
		const { circleMeshComponent, circleMesh, arrowMesh, xArrowMesh, yArrowMesh, zArrowMesh, scaleGizmo, initEngineAssets } = basicSetup({ initEngineAssets: false });

		assertEquals(circleMesh.vertexState, null);
		assertEquals(arrowMesh.vertexState, null);
		assertEquals(circleMeshComponent.materials, []);
		assertEquals(xArrowMesh.materials, []);
		assertEquals(yArrowMesh.materials, []);
		assertEquals(zArrowMesh.materials, []);

		initEngineAssets();
		scaleGizmo.updateAssets();

		assertExists(circleMesh.vertexState);
		assertExists(arrowMesh.vertexState);
		assertEquals(circleMeshComponent.materials.length, 1);
		assertEquals(xArrowMesh.materials.length, 1);
		assertEquals(yArrowMesh.materials.length, 1);
		assertEquals(zArrowMesh.materials.length, 1);
	},
});

Deno.test({
	name: "destructor removes entity from parent",
	fn() {
		const { scaleGizmo } = basicSetup();
		const parent = new Entity("parent");
		parent.add(scaleGizmo.entity);

		scaleGizmo.destructor();

		assertEquals(parent.children.length, 0);
	},
});

Deno.test({
	name: "default material colors are correct",
	fn() {
		const { getBillboardMaterial, getMeshMaterial } = basicSetup();

		const circleMaterial = getBillboardMaterial(0);
		assertVecAlmostEquals(circleMaterial.getProperty("colorMultiplier"), new Vec3(1, 1, 1));
		const xArrowMaterial = getMeshMaterial(0);
		assertVecAlmostEquals(xArrowMaterial.getProperty("colorMultiplier"), new Vec3(1, 0.15, 0.15));
		const yArrowMaterial = getMeshMaterial(1);
		assertVecAlmostEquals(yArrowMaterial.getProperty("colorMultiplier"), new Vec3(0.2, 1, 0.2));
		const zArrowMaterial = getMeshMaterial(2);
		assertVecAlmostEquals(zArrowMaterial.getProperty("colorMultiplier"), new Vec3(0.3, 0.3, 1));
	},
});

Deno.test({
	name: "hovering over the center draggable shows hover feedback",
	fn() {
		const { circleMeshComponent, createdDraggables } = basicSetup();

		const centerDraggable = createdDraggables[0];
		const material1 = circleMeshComponent.materials[0];
		assertExists(material1);
		const color1 = material1.getProperty("colorMultiplier");
		assertVecAlmostEquals(color1, [1, 1, 1]);

		centerDraggable.fireIsHoveringChange(true);

		const material2 = circleMeshComponent.materials[0];
		assertExists(material2);
		const color2 = material2.getProperty("colorMultiplier");
		assertVecAlmostEquals(color2, [1, 0.7, 0]);

		centerDraggable.fireIsHoveringChange(false);

		const material3 = circleMeshComponent.materials[0];
		assertExists(material3);
		const color3 = material3.getProperty("colorMultiplier");
		assertVecAlmostEquals(color3, [1, 1, 1]);
	},
});

Deno.test({
	name: "hovering over the x arrow draggable shows hover feedback",
	fn() {
		const { xArrowMesh, createdDraggables } = basicSetup();

		const xDraggable = createdDraggables[1];
		const material1 = xArrowMesh.materials[0];
		assertExists(material1);
		const color1 = material1.getProperty("colorMultiplier");
		assertVecAlmostEquals(color1, [1, 0.15, 0.15]);

		xDraggable.fireIsHoveringChange(true);

		const material2 = xArrowMesh.materials[0];
		assertExists(material2);
		const color2 = material2.getProperty("colorMultiplier");
		assertVecAlmostEquals(color2, [1, 0.7, 0]);

		xDraggable.fireIsHoveringChange(false);

		const material3 = xArrowMesh.materials[0];
		assertExists(material3);
		const color3 = material3.getProperty("colorMultiplier");
		assertVecAlmostEquals(color3, [1, 0.15, 0.15]);
	},
});

Deno.test({
	name: "hovering over the y arrow draggable shows hover feedback",
	fn() {
		const { yArrowMesh, createdDraggables } = basicSetup();

		const yDraggable = createdDraggables[2];
		const material1 = yArrowMesh.materials[0];
		assertExists(material1);
		const color1 = material1.getProperty("colorMultiplier");
		assertVecAlmostEquals(color1, [0.2, 1, 0.2]);

		yDraggable.fireIsHoveringChange(true);

		const material2 = yArrowMesh.materials[0];
		assertExists(material2);
		const color2 = material2.getProperty("colorMultiplier");
		assertVecAlmostEquals(color2, [1, 0.7, 0]);

		yDraggable.fireIsHoveringChange(false);

		const material3 = yArrowMesh.materials[0];
		assertExists(material3);
		const color3 = material3.getProperty("colorMultiplier");
		assertVecAlmostEquals(color3, [0.2, 1, 0.2]);
	},
});

Deno.test({
	name: "hovering over the z arrow draggable shows hover feedback",
	fn() {
		const { zArrowMesh, createdDraggables } = basicSetup();

		const zDraggable = createdDraggables[3];
		const material1 = zArrowMesh.materials[0];
		assertExists(material1);
		const color1 = material1.getProperty("colorMultiplier");
		assertVecAlmostEquals(color1, [0.3, 0.3, 1]);

		zDraggable.fireIsHoveringChange(true);

		const material2 = zArrowMesh.materials[0];
		assertExists(material2);
		const color2 = material2.getProperty("colorMultiplier");
		assertVecAlmostEquals(color2, [1, 0.7, 0]);

		zDraggable.fireIsHoveringChange(false);

		const material3 = zArrowMesh.materials[0];
		assertExists(material3);
		const color3 = material3.getProperty("colorMultiplier");
		assertVecAlmostEquals(color3, [0.3, 0.3, 1]);
	},
});

Deno.test({
	name: "dragging the center draggable fires callbacks",
	fn() {
		const { scaleGizmo, createdDraggables } = basicSetup();

		/** @type {import("../../../../../src/gizmos/gizmos/ScaleGizmo.js").ScaleGizmoDragCallback} */
		const cb = (e) => {};
		const cbSpy = spy(cb);
		scaleGizmo.onDrag(cbSpy);

		/** @type {import("../shared.js").FakeGizmoDraggable<import("../../../../../src/gizmos/draggables/ScaleGizmoDraggable.js").ScaleGizmoDragEvent>} */
		const centerDraggable = createdDraggables[0];

		centerDraggable.fireOnDrag({
			worldDelta: 1.123,
		});

		assertSpyCalls(cbSpy, 1);
		assertVecAlmostEquals(cbSpy.calls[0].args[0].localDelta, [1.123, 1.123, 1.123]);

		centerDraggable.fireOnDrag({
			worldDelta: 0.987,
		});

		assertSpyCalls(cbSpy, 2);
		assertVecAlmostEquals(cbSpy.calls[1].args[0].localDelta, [0.987, 0.987, 0.987]);
	},
});

Deno.test({
	name: "dragging the axis draggables fires callbacks",
	fn() {
		const { scaleGizmo, createdDraggables } = basicSetup();

		/** @type {import("../shared.js").FakeGizmoDraggable<import("../../../../../src/gizmos/draggables/TranslateAxisGizmoDraggable.js").TranslateAxisGizmoDragEvent>} */
		const xDraggable = createdDraggables[1];
		/** @type {import("../shared.js").FakeGizmoDraggable<import("../../../../../src/gizmos/draggables/TranslateAxisGizmoDraggable.js").TranslateAxisGizmoDragEvent>} */
		const yDraggable = createdDraggables[2];
		/** @type {import("../shared.js").FakeGizmoDraggable<import("../../../../../src/gizmos/draggables/TranslateAxisGizmoDraggable.js").TranslateAxisGizmoDragEvent>} */
		const zDraggable = createdDraggables[3];

		/** @type {import("../../../../../src/gizmos/gizmos/ScaleGizmo.js").ScaleGizmoDragCallback} */
		const cb = (e) => {};
		const cbSpy = spy(cb);
		scaleGizmo.onDrag(cbSpy);

		xDraggable.fireOnDrag({
			localDelta: 1,
			worldDelta: xDraggable.axis.clone(),
		});

		assertSpyCalls(cbSpy, 1);
		assertVecAlmostEquals(cbSpy.calls[0].args[0].localDelta, [2, 1, 1]);

		yDraggable.fireOnDrag({
			localDelta: 1,
			worldDelta: yDraggable.axis.clone(),
		});

		assertSpyCalls(cbSpy, 2);
		assertVecAlmostEquals(cbSpy.calls[1].args[0].localDelta, [1, 2, 1]);

		zDraggable.fireOnDrag({
			localDelta: 1,
			worldDelta: zDraggable.axis.clone(),
		});

		assertSpyCalls(cbSpy, 3);
		assertVecAlmostEquals(cbSpy.calls[2].args[0].localDelta, [1, 1, 2]);
	},
});

Deno.test({
	name: "draggable positions are relative to the gizmo",
	fn() {
		const { scaleGizmo, createdDraggables } = basicSetup();

		scaleGizmo.entity.pos.set(1, 1, 1);

		assertVecAlmostEquals(createdDraggables[0].entity.worldPos, [1, 1, 1]);
		assertVecAlmostEquals(createdDraggables[1].entity.worldPos, [2, 1, 1]);
		assertVecAlmostEquals(createdDraggables[2].entity.worldPos, [1, 2, 1]);
		assertVecAlmostEquals(createdDraggables[3].entity.worldPos, [1, 1, 2]);
	},
});

Deno.test({
	name: "onDragEnd callbacks fire",
	fn() {
		const { scaleGizmo, createdDraggables } = basicSetup();

		const cb1 = spy();
		const cb2 = spy();
		scaleGizmo.onDragEnd(cb1);
		scaleGizmo.onDragEnd(cb2);
		scaleGizmo.removeOnDragEnd(cb2);

		let i = 0;
		for (const draggable of createdDraggables) {
			draggable.fireOnDragEnd();
			i++;
			assertSpyCalls(cb1, i);
		}

		assertSpyCalls(cb2, 0);
	},
});
