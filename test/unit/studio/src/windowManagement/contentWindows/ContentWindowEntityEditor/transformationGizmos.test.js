import { basicTest } from "./shared.js";
import { ContentWindowEntityEditor } from "../../../../../../../studio/src/windowManagement/contentWindows/ContentWindowEntityEditor/ContentWindowEntityEditor.js";
import { assertEquals, assertInstanceOf } from "std/testing/asserts.ts";
import { Entity, Quat, TranslationGizmo, Vec3, assertQuatAlmostEquals, assertVecAlmostEquals } from "../../../../../../../src/mod.js";
import { stub } from "std/testing/mock.ts";

function createEntitiesForGizmoTests() {
	const root = new Entity("root");
	const child1 = root.add(new Entity("child1"));
	child1.pos.set(1, 2, 3);
	const child2 = root.add(new Entity("child2"));
	child2.pos.set(4, 5, 6);
	return { root, child1, child2 };
}

/**
 * @param {Entity} entity
 */
function createMockEntitySelection(entity) {
	const mockSelection = /** @type {import("../../../../../../../studio/src/misc/EntitySelection.js").EntitySelection} */ ({
		entity,
	});
	return mockSelection;
}

Deno.test({
	name: "Single gizmo at the center",
	async fn() {
		const { args, uninstall } = basicTest();
		try {
			const contentWindow = new ContentWindowEntityEditor(...args);

			const { root } = createEntitiesForGizmoTests();
			contentWindow.editingEntity = root;

			contentWindow.selectionGroup.changeSelection({
				added: [createMockEntitySelection(root)],
			});

			const gizmos = Array.from(contentWindow.gizmos.gizmos);
			assertEquals(gizmos.length, 1);
			assertVecAlmostEquals(gizmos[0].pos, [0, 0, 0]);
			assertQuatAlmostEquals(gizmos[0].rot, new Quat());
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "'center' pivot creates a single pivot at the center",
	async fn() {
		const { args, uninstall } = basicTest();
		try {
			const contentWindow = new ContentWindowEntityEditor(...args);

			const { root, child1, child2 } = createEntitiesForGizmoTests();
			contentWindow.editingEntity = root;

			assertEquals(contentWindow.transformationPivotButton.currentText, "Center");

			contentWindow.selectionGroup.changeSelection({
				added: [
					createMockEntitySelection(child1),
					createMockEntitySelection(child2),
				],
			});

			const gizmos = Array.from(contentWindow.gizmos.gizmos);
			assertEquals(gizmos.length, 1);
			assertVecAlmostEquals(gizmos[0].pos, [2.5, 3.5, 4.5]);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "'multiple' pivot creates multiple pivots at all the selected objects",
	async fn() {
		const { args, uninstall } = basicTest();
		try {
			const contentWindow = new ContentWindowEntityEditor(...args);

			const { root, child1, child2 } = createEntitiesForGizmoTests();
			contentWindow.editingEntity = root;

			contentWindow.toggleTransformationPivot();
			assertEquals(contentWindow.transformationPivotButton.currentText, "Multiple");

			contentWindow.selectionGroup.changeSelection({
				added: [createMockEntitySelection(child1)],
			});

			contentWindow.selectionGroup.changeSelection({
				added: [createMockEntitySelection(child2)],
			});

			const gizmos = Array.from(contentWindow.gizmos.gizmos);
			assertEquals(gizmos.length, 2);
			assertVecAlmostEquals(gizmos[0].pos, [1, 2, 3]);
			assertVecAlmostEquals(gizmos[1].pos, [4, 5, 6]);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "'last' pivot creates a single pivot at the last selected object",
	async fn() {
		const { args, uninstall } = basicTest();
		try {
			const contentWindow = new ContentWindowEntityEditor(...args);

			const { root, child1, child2 } = createEntitiesForGizmoTests();
			contentWindow.editingEntity = root;

			contentWindow.toggleTransformationPivot();
			contentWindow.toggleTransformationPivot();
			assertEquals(contentWindow.transformationPivotButton.currentText, "Last");

			contentWindow.selectionGroup.changeSelection({
				added: [createMockEntitySelection(child1)],
			});

			contentWindow.selectionGroup.changeSelection({
				added: [createMockEntitySelection(child2)],
			});

			const gizmos = Array.from(contentWindow.gizmos.gizmos);
			assertEquals(gizmos.length, 1);
			assertVecAlmostEquals(gizmos[0].pos, [4, 5, 6]);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Gizmos make a copy of the entity world matrix",
	async fn() {
		const { args, uninstall } = basicTest();
		try {
			const contentWindow = new ContentWindowEntityEditor(...args);

			const { root } = createEntitiesForGizmoTests();
			root.scale.set(1, 2, 3);
			contentWindow.editingEntity = root;

			contentWindow.selectionGroup.changeSelection({
				added: [createMockEntitySelection(root)],
			});

			assertVecAlmostEquals(root.scale, [1, 2, 3]);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Dragging a translation gizmo",
	async fn() {
		const { args, uninstall } = basicTest();
		try {
			const contentWindow = new ContentWindowEntityEditor(...args);

			/** @type {import("../../../../../../../src/gizmos/gizmos/TranslationGizmo.js").TranslationGizmoDragCallback[]} */
			const onDragCbs = [];

			/** @type {import("std/testing/mock.ts").Stub<import("../../../../../../../src/mod.js").GizmoManager, [...args: any[]], import("../../../../../../../src/mod.js").Gizmo>} */
			const addGizmoStub = stub(contentWindow.gizmos, "addGizmo", (...args) => {
				const gizmo = addGizmoStub.original.bind(contentWindow.gizmos)(...args);
				if (gizmo instanceof TranslationGizmo) {
					stub(gizmo, "onDrag", (cb) => {
						onDragCbs.push(cb);
					});
				}
				return gizmo;
			});

			const { root } = createEntitiesForGizmoTests();
			contentWindow.editingEntity = root;

			contentWindow.selectionGroup.changeSelection({
				added: [createMockEntitySelection(root)],
			});

			const gizmos = Array.from(contentWindow.gizmos.gizmos);
			assertEquals(gizmos.length, 1);
			assertInstanceOf(gizmos[0], TranslationGizmo);

			assertEquals(onDragCbs.length, 1);
			onDragCbs[0]({
				localDelta: new Vec3(0, 1, 0),
				worldDelta: new Vec3(0, 1, 0),
			});

			assertVecAlmostEquals(root.pos, [0, 1, 0]);
		} finally {
			uninstall();
		}
	},
});
