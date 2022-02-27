import {assertEquals, assertExists} from "asserts";
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
		translationGizmo.updateMaterials();

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
		const color1 = translationGizmo.circleMeshComponent.materials[0].getProperty("colorMultiplier");
		assertVecAlmostEquals(color1, [1, 1, 1]);

		centerDraggable.fireIsHoveringChange(true);

		const color2 = translationGizmo.circleMeshComponent.materials[0].getProperty("colorMultiplier");
		assertVecAlmostEquals(color2, [1, 0.7, 0]);

		centerDraggable.fireIsHoveringChange(false);

		const color3 = translationGizmo.circleMeshComponent.materials[0].getProperty("colorMultiplier");
		assertVecAlmostEquals(color3, [1, 1, 1]);
	},
});

Deno.test({
	name: "hovering over the x arrow draggable shows hover feedback",
	fn() {
		const {translationGizmo, createdDraggables} = basicSetup();

		const xDraggable = createdDraggables[1];
		const color1 = translationGizmo.xArrowMesh.materials[0].getProperty("colorMultiplier");
		assertVecAlmostEquals(color1, [1, 0.15, 0.15]);

		xDraggable.fireIsHoveringChange(true);

		const color2 = translationGizmo.xArrowMesh.materials[0].getProperty("colorMultiplier");
		assertVecAlmostEquals(color2, [1, 0.7, 0]);

		xDraggable.fireIsHoveringChange(false);

		const color3 = translationGizmo.xArrowMesh.materials[0].getProperty("colorMultiplier");
		assertVecAlmostEquals(color3, [1, 0.15, 0.15]);
	},
});

Deno.test({
	name: "hovering over the y arrow draggable shows hover feedback",
	fn() {
		const {translationGizmo, createdDraggables} = basicSetup();

		const yDraggable = createdDraggables[2];
		const color1 = translationGizmo.yArrowMesh.materials[0].getProperty("colorMultiplier");
		assertVecAlmostEquals(color1, [0.2, 1, 0.2]);

		yDraggable.fireIsHoveringChange(true);

		const color2 = translationGizmo.yArrowMesh.materials[0].getProperty("colorMultiplier");
		assertVecAlmostEquals(color2, [1, 0.7, 0]);

		yDraggable.fireIsHoveringChange(false);

		const color3 = translationGizmo.yArrowMesh.materials[0].getProperty("colorMultiplier");
		assertVecAlmostEquals(color3, [0.2, 1, 0.2]);
	},
});

Deno.test({
	name: "hovering over the z arrow draggable shows hover feedback",
	fn() {
		const {translationGizmo, createdDraggables} = basicSetup();

		const zDraggable = createdDraggables[3];
		const color1 = translationGizmo.zArrowMesh.materials[0].getProperty("colorMultiplier");
		assertVecAlmostEquals(color1, [0.3, 0.3, 1]);

		zDraggable.fireIsHoveringChange(true);

		const color2 = translationGizmo.zArrowMesh.materials[0].getProperty("colorMultiplier");
		assertVecAlmostEquals(color2, [1, 0.7, 0]);

		zDraggable.fireIsHoveringChange(false);

		const color3 = translationGizmo.zArrowMesh.materials[0].getProperty("colorMultiplier");
		assertVecAlmostEquals(color3, [0.3, 0.3, 1]);
	},
});

Deno.test({
	name: "dragging the center draggable updates the gizmo position",
	fn() {
		const {translationGizmo, createdDraggables} = basicSetup();

		const centerDraggable = createdDraggables[0];

		assertVecAlmostEquals(translationGizmo.pos, [0, 0, 0]);

		centerDraggable.fireOnDrag({
			delta: new Vec3(0, 1, 0),
		});

		assertVecAlmostEquals(translationGizmo.pos, [0, 1, 0]);

		centerDraggable.fireOnDrag({
			delta: new Vec3(0, 0, 1),
		});

		assertVecAlmostEquals(translationGizmo.pos, [0, 1, 1]);
	},
});

Deno.test({
	name: "dragging the axis draggables updates the gizmo position",
	fn() {
		const {translationGizmo, createdDraggables} = basicSetup();

		const xDraggable = createdDraggables[1];
		const yDraggable = createdDraggables[2];
		const zDraggable = createdDraggables[3];

		assertVecAlmostEquals(translationGizmo.pos, [0, 0, 0]);

		xDraggable.fireOnDrag({
			delta: xDraggable.axis.clone(),
		});

		assertVecAlmostEquals(translationGizmo.pos, [1, 0, 0]);

		yDraggable.fireOnDrag({
			delta: yDraggable.axis.clone(),
		});

		assertVecAlmostEquals(translationGizmo.pos, [1, 1, 0]);

		zDraggable.fireOnDrag({
			delta: zDraggable.axis.clone(),
		});

		assertVecAlmostEquals(translationGizmo.pos, [1, 1, 1]);
	},
});
