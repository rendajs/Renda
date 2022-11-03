import {assertEquals, assertExists} from "std/testing/asserts.ts";
import {assertSpyCalls, spy} from "std/testing/mock.ts";
import {Entity, TranslationGizmo, Vec3} from "../../../../../src/mod.js";
import {assertVecAlmostEquals} from "../../../shared/asserts.js";
import {createFakeGizmoManager} from "../shared.js";

/**
 * @param  {Parameters<typeof createFakeGizmoManager>} opts
 */
function basicSetup(...opts) {
	const data = createFakeGizmoManager(...opts);
	const translationGizmo = new TranslationGizmo(data.gizmoManager);

	return {
		...data,
		translationGizmo,
	};
}

Deno.test({
	name: "Materials get applied when they load via the engine assets manager",
	fn() {
		const {translationGizmo, initEngineAssets} = basicSetup({initEngineAssets: false});

		assertEquals(translationGizmo.circleMesh.vertexState, null);
		assertEquals(translationGizmo.arrowMesh.vertexState, null);
		assertEquals(translationGizmo.circleMeshComponent.materials, []);
		assertEquals(translationGizmo.xArrowMesh.materials, []);
		assertEquals(translationGizmo.yArrowMesh.materials, []);
		assertEquals(translationGizmo.zArrowMesh.materials, []);

		initEngineAssets();
		translationGizmo.updateAssets();

		assertExists(translationGizmo.circleMesh.vertexState);
		assertExists(translationGizmo.arrowMesh.vertexState);
		assertEquals(translationGizmo.circleMeshComponent.materials.length, 1);
		assertEquals(translationGizmo.xArrowMesh.materials.length, 1);
		assertEquals(translationGizmo.yArrowMesh.materials.length, 1);
		assertEquals(translationGizmo.zArrowMesh.materials.length, 1);
	},
});

Deno.test({
	name: "destructor removes entity from parent",
	fn() {
		const {translationGizmo} = basicSetup();
		const parent = new Entity("parent");
		parent.add(translationGizmo.entity);

		translationGizmo.destructor();

		assertEquals(parent.children.length, 0);
	},
});

Deno.test({
	name: "default material colors are correct",
	fn() {
		const {translationGizmo} = basicSetup();

		assertVecAlmostEquals(translationGizmo.circleMaterialColor, new Vec3(1, 1, 1));
		assertVecAlmostEquals(translationGizmo.xArrowColor, new Vec3(1, 0.15, 0.15));
		assertVecAlmostEquals(translationGizmo.yArrowColor, new Vec3(0.2, 1, 0.2));
		assertVecAlmostEquals(translationGizmo.zArrowColor, new Vec3(0.3, 0.3, 1));
	},
});

Deno.test({
	name: "hovering over the center draggable shows hover feedback",
	fn() {
		const {translationGizmo, createdDraggables} = basicSetup();

		const centerDraggable = createdDraggables[0];
		const material1 = translationGizmo.circleMeshComponent.materials[0];
		assertExists(material1);
		const color1 = material1.getProperty("colorMultiplier");
		assertVecAlmostEquals(color1, [1, 1, 1]);

		centerDraggable.fireIsHoveringChange(true);

		const material2 = translationGizmo.circleMeshComponent.materials[0];
		assertExists(material2);
		const color2 = material2.getProperty("colorMultiplier");
		assertVecAlmostEquals(color2, [1, 0.7, 0]);

		centerDraggable.fireIsHoveringChange(false);

		const material3 = translationGizmo.circleMeshComponent.materials[0];
		assertExists(material3);
		const color3 = material3.getProperty("colorMultiplier");
		assertVecAlmostEquals(color3, [1, 1, 1]);
	},
});

Deno.test({
	name: "hovering over the x arrow draggable shows hover feedback",
	fn() {
		const {translationGizmo, createdDraggables} = basicSetup();

		const xDraggable = createdDraggables[1];
		const material1 = translationGizmo.xArrowMesh.materials[0];
		assertExists(material1);
		const color1 = material1.getProperty("colorMultiplier");
		assertVecAlmostEquals(color1, [1, 0.15, 0.15]);

		xDraggable.fireIsHoveringChange(true);

		const material2 = translationGizmo.xArrowMesh.materials[0];
		assertExists(material2);
		const color2 = material2.getProperty("colorMultiplier");
		assertVecAlmostEquals(color2, [1, 0.7, 0]);

		xDraggable.fireIsHoveringChange(false);

		const material3 = translationGizmo.xArrowMesh.materials[0];
		assertExists(material3);
		const color3 = material3.getProperty("colorMultiplier");
		assertVecAlmostEquals(color3, [1, 0.15, 0.15]);
	},
});

Deno.test({
	name: "hovering over the y arrow draggable shows hover feedback",
	fn() {
		const {translationGizmo, createdDraggables} = basicSetup();

		const yDraggable = createdDraggables[2];
		const material1 = translationGizmo.yArrowMesh.materials[0];
		assertExists(material1);
		const color1 = material1.getProperty("colorMultiplier");
		assertVecAlmostEquals(color1, [0.2, 1, 0.2]);

		yDraggable.fireIsHoveringChange(true);

		const material2 = translationGizmo.yArrowMesh.materials[0];
		assertExists(material2);
		const color2 = material2.getProperty("colorMultiplier");
		assertVecAlmostEquals(color2, [1, 0.7, 0]);

		yDraggable.fireIsHoveringChange(false);

		const material3 = translationGizmo.yArrowMesh.materials[0];
		assertExists(material3);
		const color3 = material3.getProperty("colorMultiplier");
		assertVecAlmostEquals(color3, [0.2, 1, 0.2]);
	},
});

Deno.test({
	name: "hovering over the z arrow draggable shows hover feedback",
	fn() {
		const {translationGizmo, createdDraggables} = basicSetup();

		const zDraggable = createdDraggables[3];
		const material1 = translationGizmo.zArrowMesh.materials[0];
		assertExists(material1);
		const color1 = material1.getProperty("colorMultiplier");
		assertVecAlmostEquals(color1, [0.3, 0.3, 1]);

		zDraggable.fireIsHoveringChange(true);

		const material2 = translationGizmo.zArrowMesh.materials[0];
		assertExists(material2);
		const color2 = material2.getProperty("colorMultiplier");
		assertVecAlmostEquals(color2, [1, 0.7, 0]);

		zDraggable.fireIsHoveringChange(false);

		const material3 = translationGizmo.zArrowMesh.materials[0];
		assertExists(material3);
		const color3 = material3.getProperty("colorMultiplier");
		assertVecAlmostEquals(color3, [0.3, 0.3, 1]);
	},
});

Deno.test({
	name: "dragging the center draggable updates the gizmo position and fires callbacks",
	fn() {
		const {translationGizmo, createdDraggables} = basicSetup();

		/** @type {import("../../../../../src/gizmos/gizmos/TranslationGizmo.js").TranslationGizmoDragCallback} */
		const cb = e => {};
		const cbSpy = spy(cb);
		translationGizmo.onDrag(cbSpy);

		/** @type {import("../shared.js").FakeGizmoDraggable<import("../../../../../src/gizmos/draggables/TranslateGizmoDraggable.js").TranslateGizmoDragEvent>} */
		const centerDraggable = createdDraggables[0];

		assertVecAlmostEquals(translationGizmo.pos, [0, 0, 0]);

		centerDraggable.fireOnDrag({
			worldDelta: new Vec3(0, 1, 0),
		});

		assertVecAlmostEquals(translationGizmo.pos, [0, 1, 0]);
		assertSpyCalls(cbSpy, 1);
		assertVecAlmostEquals(cbSpy.calls[0].args[0].localDelta, [0, 1, 0]);
		assertVecAlmostEquals(cbSpy.calls[0].args[0].worldDelta, [0, 1, 0]);

		centerDraggable.fireOnDrag({
			worldDelta: new Vec3(0, 0, 1),
		});

		assertVecAlmostEquals(translationGizmo.pos, [0, 1, 1]);
		assertSpyCalls(cbSpy, 2);
		assertVecAlmostEquals(cbSpy.calls[1].args[0].localDelta, [0, 0, 1]);
		assertVecAlmostEquals(cbSpy.calls[1].args[0].worldDelta, [0, 0, 1]);
	},
});

Deno.test({
	name: "dragging the axis draggables updates the gizmo position and fires callbacks",
	fn() {
		const {translationGizmo, createdDraggables} = basicSetup();

		/** @type {import("../shared.js").FakeGizmoDraggable<import("../../../../../src/gizmos/draggables/TranslateAxisGizmoDraggable.js").TranslateAxisGizmoDragEvent>} */
		const xDraggable = createdDraggables[1];
		/** @type {import("../shared.js").FakeGizmoDraggable<import("../../../../../src/gizmos/draggables/TranslateAxisGizmoDraggable.js").TranslateAxisGizmoDragEvent>} */
		const yDraggable = createdDraggables[2];
		/** @type {import("../shared.js").FakeGizmoDraggable<import("../../../../../src/gizmos/draggables/TranslateAxisGizmoDraggable.js").TranslateAxisGizmoDragEvent>} */
		const zDraggable = createdDraggables[3];

		/** @type {import("../../../../../src/gizmos/gizmos/TranslationGizmo.js").TranslationGizmoDragCallback} */
		const cb = e => {};
		const cbSpy = spy(cb);
		translationGizmo.onDrag(cbSpy);

		assertVecAlmostEquals(translationGizmo.pos, [0, 0, 0]);

		xDraggable.fireOnDrag({
			localDelta: 1,
			worldDelta: xDraggable.axis.clone(),
		});

		assertVecAlmostEquals(translationGizmo.pos, [1, 0, 0]);
		assertSpyCalls(cbSpy, 1);
		assertVecAlmostEquals(cbSpy.calls[0].args[0].localDelta, [1, 0, 0]);
		assertVecAlmostEquals(cbSpy.calls[0].args[0].worldDelta, [1, 0, 0]);

		yDraggable.fireOnDrag({
			localDelta: 1,
			worldDelta: yDraggable.axis.clone(),
		});

		assertVecAlmostEquals(translationGizmo.pos, [1, 1, 0]);
		assertSpyCalls(cbSpy, 2);
		assertVecAlmostEquals(cbSpy.calls[1].args[0].localDelta, [0, 1, 0]);
		assertVecAlmostEquals(cbSpy.calls[1].args[0].worldDelta, [0, 1, 0]);

		zDraggable.fireOnDrag({
			localDelta: 1,
			worldDelta: zDraggable.axis.clone(),
		});

		assertVecAlmostEquals(translationGizmo.pos, [1, 1, 1]);
		assertSpyCalls(cbSpy, 3);
		assertVecAlmostEquals(cbSpy.calls[2].args[0].localDelta, [0, 0, 1]);
		assertVecAlmostEquals(cbSpy.calls[2].args[0].worldDelta, [0, 0, 1]);
	},
});

Deno.test({
	name: "draggable positions are relative to the gizmo",
	fn() {
		const {translationGizmo, createdDraggables} = basicSetup();

		translationGizmo.entity.pos.set(1, 1, 1);

		assertVecAlmostEquals(createdDraggables[0].entity.worldPos, [1, 1, 1]);
		assertVecAlmostEquals(createdDraggables[1].entity.worldPos, [2, 1, 1]);
		assertVecAlmostEquals(createdDraggables[2].entity.worldPos, [1, 2, 1]);
		assertVecAlmostEquals(createdDraggables[3].entity.worldPos, [1, 1, 2]);
	},
});
