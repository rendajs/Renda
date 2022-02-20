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

		assertEquals(translationGizmo.arrowMesh.vertexState, null);
		assertEquals(translationGizmo.circleMesh.vertexState, null);
		assertEquals(translationGizmo.meshComponent.materials, []);
		assertEquals(translationGizmo.circleMeshComponent.materials, []);

		initEngineAssets();
		translationGizmo.updateMaterials();

		assertExists(translationGizmo.arrowMesh.vertexState);
		assertExists(translationGizmo.circleMesh.vertexState);
		assertEquals(translationGizmo.meshComponent.materials.length, 1);
		assertEquals(translationGizmo.circleMeshComponent.materials.length, 1);
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
	name: "hovering over the center draggable shows hover feedback",
	fn() {
		const {translationGizmo, createdDraggables} = basicSetup();

		const centerDraggable = createdDraggables[0];
		const color1 = translationGizmo.circleMeshComponent.materials[0].getProperty("colorMultiplier");
		assertVecAlmostEquals(color1, [1, 1, 1]);

		centerDraggable.fireIsHoveringChange(true);

		const color2 = translationGizmo.circleMeshComponent.materials[0].getProperty("colorMultiplier");
		assertVecAlmostEquals(color2, [1, 0.5, 0]);

		centerDraggable.fireIsHoveringChange(false);

		const color3 = translationGizmo.circleMeshComponent.materials[0].getProperty("colorMultiplier");
		assertVecAlmostEquals(color3, [1, 1, 1]);
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
