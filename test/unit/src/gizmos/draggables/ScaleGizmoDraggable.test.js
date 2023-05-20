import {assertAlmostEquals, assertEquals} from "std/testing/asserts.ts";
import {Vec2} from "../../../../../src/mod.js";
import {basicSetup} from "./shared.js";
import {ScaleGizmoDraggable} from "../../../../../src/gizmos/draggables/ScaleGizmoDraggable.js";

/**
 * @param {Vec2} screenPosFrom
 * @param {Vec2} screenPosTo
 * @param {number} expectedDelta
 */
function movementTest(screenPosFrom, screenPosTo, expectedDelta) {
	const {mockGizmoManager, mockPointerDevice, mockCamera} = basicSetup();
	const draggable = new ScaleGizmoDraggable(mockGizmoManager);
	/** @type {import("../../../../../src/gizmos/draggables/ScaleGizmoDraggable.js").ScaleGizmoDragEvent[]} */
	const calls = [];
	draggable.onDrag(event => {
		calls.push(event);
	});

	draggable.handlePointerDown(mockPointerDevice, {
		camera: mockCamera,
		screenPos: screenPosFrom,
	});
	draggable.handlePointerMove(mockPointerDevice, {
		camera: mockCamera,
		screenPos: screenPosTo,
	});

	assertEquals(calls.length, 1);
	assertAlmostEquals(calls[0].worldDelta, expectedDelta);
}

Deno.test({
	name: `scale up`,
	fn() {
		movementTest(new Vec2(0.6, 0.5), new Vec2(0.65, 0.5), 1.33296188);
	},
});

Deno.test({
	name: "scale down",
	fn() {
		movementTest(new Vec2(0.65, 0.5), new Vec2(0.6, 0.5), 0.75020899);
	},
});

Deno.test({
	name: "Move to the exact opposite position of the center",
	fn() {
		movementTest(new Vec2(0.5, 0.65), new Vec2(0.5, 0.35), 1);
	},
});
