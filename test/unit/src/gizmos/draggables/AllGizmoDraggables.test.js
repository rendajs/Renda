import { AssertionError, assertAlmostEquals, assertEquals } from "std/testing/asserts.ts";
import { TranslateGizmoDraggable } from "../../../../../src/gizmos/draggables/TranslateGizmoDraggable.js";
import { TranslateAxisGizmoDraggable } from "../../../../../src/gizmos/draggables/TranslateAxisGizmoDraggable.js";
import { RotateAxisGizmoDraggable } from "../../../../../src/gizmos/draggables/RotateAxisGizmoDraggable.js";
import { Quat, Vec2, Vec3 } from "../../../../../src/mod.js";
import { assertQuatAlmostEquals, assertVecAlmostEquals } from "../../../shared/asserts.js";
import { basicSetup } from "./shared.js";
import { ScaleGizmoDraggable } from "../../../../../src/gizmos/draggables/ScaleGizmoDraggable.js";

/**
 * @fileoverview This test file performs tests for functionality that is
 * required by all GizmoDraggable types. When creating a new GizmoDraggable
 * type, add the constructor of your draggable to the array in this file.
 */

const draggableTypes = [
	TranslateGizmoDraggable,
	TranslateAxisGizmoDraggable,
	RotateAxisGizmoDraggable,
	ScaleGizmoDraggable,
];

Deno.test({
	name: "down up without move doesn't fire drag callbacks",
	fn() {
		const { mockGizmoManager, mockPointerDevice, mockCamera } = basicSetup();

		for (const Draggable of draggableTypes) {
			const draggable = new Draggable(mockGizmoManager);
			let callbackCalled = false;
			draggable.onDrag(() => {
				callbackCalled = true;
			});

			draggable.handlePointerDown(mockPointerDevice, {
				camera: mockCamera,
				screenPos: new Vec2(0, 0),
			});
			draggable.handlePointerUp(mockPointerDevice);

			assertEquals(callbackCalled, false, `onDrag callback wasn't called for ${Draggable.name}`);
		}
	},
});

/**
 * @typedef DraggableDragEvent
 * @property {Vec3 | Quat | number} worldDelta
 * @property {number} [localDelta]
 */

/**
 * @param {DraggableDragEvent[]} calls
 * @param {typeof draggableTypes[0]} Draggable
 */
function assertSingleUnmovedCall(calls, Draggable) {
	assertEquals(calls.length, 1, `onDrag callback wasn't called for ${Draggable.name}`);

	const worldDelta = calls[0].worldDelta;
	if (worldDelta instanceof Vec3) {
		assertVecAlmostEquals(worldDelta, [0, 0, 0]);
	} else if (worldDelta instanceof Quat) {
		assertQuatAlmostEquals(worldDelta, Quat.identity);
	} else if (typeof worldDelta == "number") {
		if (Draggable == ScaleGizmoDraggable) {
			assertEquals(worldDelta, 1);
		} else {
			throw new AssertionError(`Unexpected scalar value for worldDelta from ${Draggable.name}`);
		}
	} else {
		throw new AssertionError(`Expected worldDelta for ${Draggable.name} to either be a Vec3 or a Quat`);
	}

	const localDelta = calls[0].localDelta;
	if (localDelta != undefined) {
		assertAlmostEquals(localDelta, 0);
	}
}

Deno.test({
	name: "move event without movement",
	fn() {
		const { mockGizmoManager, mockPointerDevice, mockCamera } = basicSetup();

		for (const Draggable of draggableTypes) {
			const draggable = new Draggable(mockGizmoManager);
			/** @type {DraggableDragEvent[]} */
			const calls = [];
			draggable.onDrag(event => {
				calls.push(event);
			});

			draggable.handlePointerDown(mockPointerDevice, {
				camera: mockCamera,
				screenPos: new Vec2(0.5, 0.5),
			});
			draggable.handlePointerMove(mockPointerDevice, {
				camera: mockCamera,
				screenPos: new Vec2(0.5, 0.5),
			});

			assertSingleUnmovedCall(calls, Draggable);
		}
	},
});

Deno.test({
	name: "move event without movement, cursor starts slightly off from the center",
	fn() {
		const { mockGizmoManager, mockPointerDevice, mockCamera } = basicSetup();

		for (const Draggable of draggableTypes) {
			const draggable = new Draggable(mockGizmoManager);
			/** @type {DraggableDragEvent[]} */
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
				screenPos: new Vec2(0.55, 0.55),
			});

			assertSingleUnmovedCall(calls, Draggable);
		}
	},
});
