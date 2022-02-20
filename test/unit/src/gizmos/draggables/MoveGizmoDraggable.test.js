import {assertEquals} from "asserts";
import {MoveGizmoDraggable} from "../../../../../src/gizmos/draggables/MoveGizmoDraggable.js";
import {Mat4, Vec2} from "../../../../../src/mod.js";
import {screenToWorldPos, worldToScreenPos} from "../../../../../src/util/cameraUtil.js";
import {assertVecAlmostEquals} from "../../../shared/asserts.js";

const camWorldMatrix = Mat4.createTranslation(0, 0, -5);
const camProjectionMatrix = Mat4.createPerspective(90, 0.01, 1000);
const mockGizmoManager = /** @type {import("../../../../../src/mod.js").GizmoManager} */ ({});
const mockPointerDevice = /** @type {import("../../../../../src/gizmos/GizmoPointerDevice.js").GizmoPointerDevice} */ ({});
const mockCamera = /** @type {import("../../../../../src/mod.js").CameraComponent} */ ({
	worldToScreenPos(pos) {
		return worldToScreenPos(pos, camProjectionMatrix, camWorldMatrix);
	},
	screenToWorldPos(pos) {
		return screenToWorldPos(pos, camProjectionMatrix, camWorldMatrix);
	},
});

Deno.test({
	name: "down up without move doesn't fire drag callbacks",
	fn() {
		const draggable = new MoveGizmoDraggable(mockGizmoManager);
		let callbackCalled = false;
		draggable.onDrag(() => {
			callbackCalled = true;
		});

		draggable.handlePointerDown(mockPointerDevice, {
			camera: mockCamera,
			screenPos: new Vec2(0, 0),
		});
		draggable.handlePointerUp(mockPointerDevice);

		assertEquals(callbackCalled, false);
	},
});

Deno.test({
	name: "move event without movement",
	fn() {
		const draggable = new MoveGizmoDraggable(mockGizmoManager);
		/** @type {import("../../../../../src/gizmos/draggables/MoveGizmoDraggable.js").GizmoDragMoveEvent[]} */
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

		assertEquals(calls.length, 1);
		assertVecAlmostEquals(calls[0].delta, [0, 0, 0]);
	},
});

Deno.test({
	name: "move event without movement, cursor starts slightly off from the center",
	fn() {
		const draggable = new MoveGizmoDraggable(mockGizmoManager);
		/** @type {import("../../../../../src/gizmos/draggables/MoveGizmoDraggable.js").GizmoDragMoveEvent[]} */
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

		assertEquals(calls.length, 1);
		assertVecAlmostEquals(calls[0].delta, [0, 0, 0]);
	},
});

Deno.test({
	name: "move event with movement",
	fn() {
		const draggable = new MoveGizmoDraggable(mockGizmoManager);
		/** @type {import("../../../../../src/gizmos/draggables/MoveGizmoDraggable.js").GizmoDragMoveEvent[]} */
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
		assertVecAlmostEquals(calls[0].delta, [0.2, 0, 0]);
		assertVecAlmostEquals(draggable.pos, [0.2, 0, 0]);
	},
});
