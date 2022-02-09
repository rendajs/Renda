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

		assertVecAlmostEquals(screenPos2, [0, 0]);
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
