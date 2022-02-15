import {assertEquals, assertNotEquals} from "asserts";
import {GizmoDraggable} from "../../../../src/gizmos/GizmoDraggable.js";
import {Sphere, Vec2, Vec3} from "../../../../src/mod.js";
import {assertVecAlmostEquals} from "../../shared/asserts.js";
import {initBasicSetup} from "./shared.js";

const mockGizmoManager = /** @type {import("../../../../src/mod.js").GizmoManager} */ ({});

Deno.test({
	name: "getScreenPos, center",
	fn() {
		const {cam, draggable} = initBasicSetup();
		const screenPos = draggable.getScreenPos(cam);
		const screenPos2 = new Vec2(screenPos);

		assertVecAlmostEquals(screenPos2, [0.5, 0.5]);
	},
});

Deno.test({
	name: "raycast no shapes added",
	fn() {
		const draggable = new GizmoDraggable(mockGizmoManager);
		const start = new Vec3(0, 0, 0);
		const dir = new Vec3(1, 0, 0);

		const result = draggable.raycast(start, dir);

		assertEquals(result, null);
	},
});

Deno.test({
	name: "raycast miss",
	fn() {
		const draggable = new GizmoDraggable(mockGizmoManager);
		const sphere = new Sphere();
		draggable.addRaycastShape(sphere);

		const start = new Vec3(-10, 10, 0);
		const dir = new Vec3(1, 0, 0);

		const result = draggable.raycast(start, dir);

		assertEquals(result, null);
	},
});

Deno.test({
	name: "raycast hit",
	fn() {
		const draggable = new GizmoDraggable(mockGizmoManager);
		const sphere = new Sphere();
		draggable.addRaycastShape(sphere);

		const start = new Vec3(-10, 0, 0);
		const dir = new Vec3(1, 0, 0);

		const result = draggable.raycast(start, dir);

		assertNotEquals(result, null);
	},
});

const mockPointer1 = /** @type {import("../../../../src/gizmos/GizmoPointerDevice.js").GizmoPointerDevice} */ ({});
const mockPointer2 = /** @type {import("../../../../src/gizmos/GizmoPointerDevice.js").GizmoPointerDevice} */ ({});

Deno.test({
	name: "pointer over",
	fn() {
		const draggable = new GizmoDraggable(mockGizmoManager);

		draggable.pointerOver(mockPointer1);

		assertEquals(draggable.isHovering, true);
	},
});

Deno.test({
	name: "pointer over and out",
	fn() {
		const draggable = new GizmoDraggable(mockGizmoManager);

		draggable.pointerOver(mockPointer1);
		draggable.pointerOut(mockPointer1);

		assertEquals(draggable.isHovering, false);
	},
});

Deno.test({
	name: "pointer over, multiple cameras",
	fn() {
		const draggable = new GizmoDraggable(mockGizmoManager);

		draggable.pointerOver(mockPointer1);
		draggable.pointerOver(mockPointer2);
		draggable.pointerOut(mockPointer1);

		assertEquals(draggable.isHovering, true);
	},
});

Deno.test({
	name: "pointer over, over twice, out once",
	fn() {
		const draggable = new GizmoDraggable(mockGizmoManager);

		draggable.pointerOver(mockPointer1);
		draggable.pointerOver(mockPointer1);
		draggable.pointerOut(mockPointer1);

		assertEquals(draggable.isHovering, false);
	},
});

Deno.test({
	name: "onIsHoveringChange()",
	fn() {
		const draggable = new GizmoDraggable(mockGizmoManager);
		/** @type {boolean[]} */
		const cbResults = [];

		draggable.onIsHoveringChange(isHovering => {
			cbResults.push(draggable.isHovering);
		});

		draggable.pointerOver(mockPointer1);
		draggable.pointerOut(mockPointer1);

		assertEquals(cbResults, [true, false]);
	},
});

Deno.test({
	name: "onIsHoveringChange() doesn't fire when there's no change",
	fn() {
		const draggable = new GizmoDraggable(mockGizmoManager);
		/** @type {boolean[]} */
		const cbResults = [];

		draggable.onIsHoveringChange(isHovering => {
			cbResults.push(draggable.isHovering);
		});

		draggable.pointerOver(mockPointer1);
		draggable.pointerOver(mockPointer2);
		draggable.pointerOut(mockPointer1);
		draggable.pointerOut(mockPointer2);

		assertEquals(cbResults, [true, false]);
	},
});

Deno.test({
	name: "removeOnIsHoveringChange()",
	fn() {
		const draggable = new GizmoDraggable(mockGizmoManager);
		let callbackCalled = false;
		const cb = () => {
			callbackCalled = true;
		};

		draggable.onIsHoveringChange(cb);
		draggable.removeOnIsHoveringChange(cb);

		draggable.pointerOver(mockPointer1);
		draggable.pointerOut(mockPointer1);

		assertEquals(callbackCalled, false);
	},
});

Deno.test({
	name: "onDrag fires when dragging",
	fn() {
		const draggable = new GizmoDraggable(mockGizmoManager);
		let callbackCalled = false;
		const cb = () => {
			callbackCalled = true;
		};
		draggable.onDrag(cb);

		draggable.pointerDown(mockPointer1, new Vec2(0, 0));
		draggable.pointerMove(mockPointer1, new Vec2(0, 0));

		assertEquals(callbackCalled, true);
	},
});

Deno.test({
	name: "onDrag doesn't fire for move events without a pointer down event",
	fn() {
		const draggable = new GizmoDraggable(mockGizmoManager);
		let callbackCalled = false;
		const cb = () => {
			callbackCalled = true;
		};
		draggable.onDrag(cb);

		draggable.pointerMove(mockPointer1, new Vec2(0, 0));

		assertEquals(callbackCalled, false);
	},
});

Deno.test({
	name: "onDrag doesn't fire for move events from a pointerDevice that is not dragging",
	fn() {
		const draggable = new GizmoDraggable(mockGizmoManager);
		let callbackCalled = false;
		const cb = () => {
			callbackCalled = true;
		};
		draggable.onDrag(cb);

		draggable.pointerDown(mockPointer1, new Vec2(0, 0));
		draggable.pointerMove(mockPointer2, new Vec2(0, 0));

		assertEquals(callbackCalled, false);
	},
});

Deno.test({
	name: "onDrag doesn't fire for move events from a pointerDevice that has stopped dragging",
	fn() {
		const draggable = new GizmoDraggable(mockGizmoManager);
		let callbackCalled = false;
		const cb = () => {
			callbackCalled = true;
		};
		draggable.onDrag(cb);

		draggable.pointerDown(mockPointer1, new Vec2(0, 0));
		draggable.pointerUp(mockPointer1, new Vec2(0, 0));
		draggable.pointerMove(mockPointer1, new Vec2(0, 0));

		assertEquals(callbackCalled, false);
	},
});

Deno.test({
	name: "pointerDown is ignored when another pointer device is already dragging",
	fn() {
		const draggable = new GizmoDraggable(mockGizmoManager);
		let callbackCalled = false;
		const cb = () => {
			callbackCalled = true;
		};
		draggable.onDrag(cb);

		draggable.pointerDown(mockPointer1, new Vec2(0, 0));
		draggable.pointerDown(mockPointer2, new Vec2(0, 0));
		draggable.pointerMove(mockPointer2, new Vec2(0, 0));

		assertEquals(callbackCalled, false);
	},
});

Deno.test({
	name: "pointerUp is ignored when coming from another pointer device",
	fn() {
		const draggable = new GizmoDraggable(mockGizmoManager);
		let callbackCalled = false;
		const cb = () => {
			callbackCalled = true;
		};
		draggable.onDrag(cb);

		draggable.pointerDown(mockPointer1, new Vec2(0, 0));
		draggable.pointerUp(mockPointer2, new Vec2(0, 0));
		draggable.pointerMove(mockPointer1, new Vec2(0, 0));

		assertEquals(callbackCalled, true);
	},
});

Deno.test({
	name: "onDrag doesn't fire on removed event listeners",
	fn() {
		const draggable = new GizmoDraggable(mockGizmoManager);
		let callCount = 0;
		const cb = () => {
			callCount++;
		};

		draggable.onDrag(cb);
		draggable.pointerDown(mockPointer1, new Vec2(0, 0));
		draggable.pointerMove(mockPointer1, new Vec2(0, 0));
		assertEquals(callCount, 1);

		draggable.removeOnDrag(cb);
		draggable.pointerMove(mockPointer1, new Vec2(0, 0));
		assertEquals(callCount, 1);
	},
});
