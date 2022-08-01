import {assertEquals} from "std/testing/asserts.ts";
import {TranslateAxisGizmoDraggable} from "../../../../../src/gizmos/draggables/TranslateAxisGizmoDraggable.js";
import {Vec2} from "../../../../../src/mod.js";
import {assertVecAlmostEquals} from "../../../shared/asserts.js";
import {basicSetup} from "./shared.js";

Deno.test({
	name: "move event with movement",
	fn() {
		const {mockGizmoManager, mockPointerDevice, mockCamera} = basicSetup();
		const draggable = new TranslateAxisGizmoDraggable(mockGizmoManager);
		/** @type {import("../../../../../src/gizmos/draggables/TranslateGizmoDraggable.js").GizmoDragMoveEvent[]} */
		const calls = [];
		draggable.onDrag(event => {
			calls.push(event);
		});

		draggable.handlePointerDown(mockPointerDevice, {
			camera: mockCamera,
			screenPos: new Vec2(0.55, 0.55),
		});
		draggable.handlePointerMove(mockPointerDevice, {
			camera: mockCamera,
			screenPos: new Vec2(0.57, 0.55),
		});

		assertEquals(calls.length, 1);
		assertVecAlmostEquals(calls[0].delta, [0.198, 0, 0], 0.001);
	},
});
