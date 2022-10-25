import {assertEquals} from "std/testing/asserts.ts";
import {TranslateGizmoDraggable} from "../../../../../src/gizmos/draggables/TranslateGizmoDraggable.js";
import {TranslateAxisGizmoDraggable} from "../../../../../src/gizmos/draggables/TranslateAxisGizmoDraggable.js";
import {Vec2} from "../../../../../src/mod.js";
import {assertVecAlmostEquals} from "../../../shared/asserts.js";
import {basicSetup} from "./shared.js";

/**
 * @fileoverview This test file performs tests for functionality that is
 * required by all GizmoDraggable types. When creating a new GizmoDraggable
 * type, add the constructor of your draggable to the array in this file.
 */

const draggableTypes = [
	TranslateGizmoDraggable,
	TranslateAxisGizmoDraggable,
];

Deno.test({
	name: "down up without move doesn't fire drag callbacks",
	fn() {
		const {mockGizmoManager, mockPointerDevice, mockCamera} = basicSetup();

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

Deno.test({
	name: "move event without movement",
	fn() {
		const {mockGizmoManager, mockPointerDevice, mockCamera} = basicSetup();

		for (const Draggable of draggableTypes) {
			const draggable = new Draggable(mockGizmoManager);
			/** @type {import("../../../../../src/gizmos/draggables/TranslateGizmoDraggable.js").TranslateGizmoDragEvent[]} */
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

			assertEquals(calls.length, 1, `onDrag callback wasn't called for ${Draggable.name}`);
			assertVecAlmostEquals(calls[0].worldDelta, [0, 0, 0]);
		}
	},
});

Deno.test({
	name: "move event without movement, cursor starts slightly off from the center",
	fn() {
		const {mockGizmoManager, mockPointerDevice, mockCamera} = basicSetup();

		for (const Draggable of draggableTypes) {
			const draggable = new TranslateGizmoDraggable(mockGizmoManager);
			/** @type {import("../../../../../src/gizmos/draggables/TranslateGizmoDraggable.js").TranslateGizmoDragEvent[]} */
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

			assertEquals(calls.length, 1, `onDrag callback wasn't called for ${Draggable.name}`);
			assertVecAlmostEquals(calls[0].worldDelta, [0, 0, 0]);
		}
	},
});
