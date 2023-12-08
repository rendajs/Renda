import {assertEquals} from "std/testing/asserts.ts";
import {RotateAxisGizmoDraggable} from "../../../../../src/gizmos/draggables/RotateAxisGizmoDraggable.js";
import {Quat, Vec2} from "../../../../../src/mod.js";
import {assertQuatAlmostEquals} from "../../../shared/asserts.js";
import {basicSetup} from "./shared.js";

Deno.test({
	name: "move event with movement",
	fn() {
		const {mockGizmoManager, mockPointerDevice, mockCamera} = basicSetup();
		const draggable = new RotateAxisGizmoDraggable(mockGizmoManager);
		/** @type {import("../../../../../src/gizmos/draggables/RotateAxisGizmoDraggable.js").RotateAxisGizmoDragEvent[]} */
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
		assertQuatAlmostEquals(calls[0].worldDelta, new Quat(-0.1893, 0, 0, 0.9819), 0.001);
	},
});
