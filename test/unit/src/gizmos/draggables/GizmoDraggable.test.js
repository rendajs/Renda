import { assertEquals, assertNotEquals, assertStrictEquals } from "std/testing/asserts.ts";
import { assertSpyCalls, spy } from "std/testing/mock.ts";
import { GizmoDraggable } from "../../../../../src/gizmos/draggables/GizmoDraggable.js";
import { CameraComponent, Entity, Sphere, Vec2, Vec3 } from "../../../../../src/mod.js";
import { assertVecAlmostEquals } from "../../../shared/asserts.js";

const mockGizmoManager = /** @type {import("../../../../../src/mod.js").GizmoManager} */ ({});

/**
 * @extends GizmoDraggable<Object>
 */
class ExtendedDraggable extends GizmoDraggable {
	/**
	 * @param  {ConstructorParameters<typeof GizmoDraggable>} args
	 */
	constructor(...args) {
		super(...args);

		this.handlePointerDownCalls = 0;
		this.handlePointerUpCalls = 0;
		this.handlePointerMoveCalls = 0;
	}

	handlePointerDown() {
		this.handlePointerDownCalls++;
	}

	handlePointerUp() {
		this.handlePointerUpCalls++;
	}

	handlePointerMove() {
		this.handlePointerMoveCalls++;
	}
}

Deno.test({
	name: "getScreenPos, center",
	fn() {
		const cameraObject = new Entity();
		cameraObject.pos.set(-2, 0.7, -2);
		cameraObject.rot.setFromAxisAngle(0.2, 0.7, -0.1);
		const cam = cameraObject.addComponent(CameraComponent);

		const draggable = new GizmoDraggable(mockGizmoManager);
		const screenPos = draggable.getScreenPos(cam);
		const screenPos2 = new Vec2(screenPos);

		assertVecAlmostEquals(screenPos2, [0.5, 0.5], 0.1);
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

const mockPointer1 = /** @type {import("../../../../../src/gizmos/GizmoPointerDevice.js").GizmoPointerDevice} */ ({});
const mockPointer2 = /** @type {import("../../../../../src/gizmos/GizmoPointerDevice.js").GizmoPointerDevice} */ ({});

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

/** @type {import("../../../../../src/gizmos/GizmoPointerDevice.js").GizmoPointerEventData} */
const stubPointerEventData = {
	camera: /** @type {import("../../../../../src/mod.js").CameraComponent} */ ({}),
	screenPos: new Vec2(0, 0),
};

Deno.test({
	name: "handlePointerDown() fires onPointerDown",
	fn() {
		const draggable = new ExtendedDraggable(mockGizmoManager);
		draggable.pointerDown(mockPointer1, stubPointerEventData);

		assertEquals(draggable.handlePointerDownCalls, 1);
	},
});

Deno.test({
	name: "handlePointerDown() doesn't fire when another pointer device is already active",
	fn() {
		const draggable = new ExtendedDraggable(mockGizmoManager);
		draggable.pointerDown(mockPointer1, stubPointerEventData);
		draggable.pointerDown(mockPointer2, stubPointerEventData);

		assertEquals(draggable.handlePointerDownCalls, 1);
	},
});

Deno.test({
	name: "handlePointerUp() fires onPointerUp and onDragEndCbs",
	fn() {
		const draggable = new ExtendedDraggable(mockGizmoManager);
		const cb1 = spy();
		const cb2 = spy();
		draggable.onDragEnd(cb1);
		draggable.onDragEnd(cb2);
		draggable.removeOnDragEnd(cb2);

		draggable.pointerDown(mockPointer1, stubPointerEventData);
		draggable.pointerUp(mockPointer1);

		assertEquals(draggable.handlePointerUpCalls, 1);
		assertSpyCalls(cb1, 1);
		assertSpyCalls(cb2, 0);
	},
});

Deno.test({
	name: "handlePointerUp() doesn't fire when no pointer device is active",
	fn() {
		const draggable = new ExtendedDraggable(mockGizmoManager);
		const cb = spy();
		draggable.onDragEnd(cb);
		draggable.pointerUp(mockPointer1);

		assertEquals(draggable.handlePointerUpCalls, 0);
		assertSpyCalls(cb, 0);
	},
});

Deno.test({
	name: "handlePointerUp() doesn't fire when another pointer device is active",
	fn() {
		const draggable = new ExtendedDraggable(mockGizmoManager);
		draggable.pointerDown(mockPointer1, stubPointerEventData);
		draggable.pointerUp(mockPointer2);

		assertEquals(draggable.handlePointerUpCalls, 0);
	},
});

Deno.test({
	name: "handlePointerMove() fires onPointerMove",
	fn() {
		const draggable = new ExtendedDraggable(mockGizmoManager);
		draggable.pointerDown(mockPointer1, stubPointerEventData);
		draggable.pointerMove(mockPointer1, stubPointerEventData);

		assertEquals(draggable.handlePointerMoveCalls, 1);
	},
});

Deno.test({
	name: "handlePointerMove() doesn't fire when no pointer device is active",
	fn() {
		const draggable = new ExtendedDraggable(mockGizmoManager);
		draggable.pointerMove(mockPointer1, stubPointerEventData);

		assertEquals(draggable.handlePointerMoveCalls, 0);
	},
});

Deno.test({
	name: "handlePointerMove() doesn't fire when another pointer device is active",
	fn() {
		const draggable = new ExtendedDraggable(mockGizmoManager);
		draggable.pointerDown(mockPointer1, stubPointerEventData);
		draggable.pointerMove(mockPointer2, stubPointerEventData);

		assertEquals(draggable.handlePointerMoveCalls, 0);
	},
});

Deno.test({
	name: "handlePointerMove() doesn't fire when another pointer device is active, even with a down event",
	fn() {
		const draggable = new ExtendedDraggable(mockGizmoManager);
		draggable.pointerDown(mockPointer1, stubPointerEventData);
		draggable.pointerDown(mockPointer2, stubPointerEventData);
		draggable.pointerMove(mockPointer2, stubPointerEventData);

		assertEquals(draggable.handlePointerMoveCalls, 0);
	},
});

Deno.test({
	name: "handlePointerMove() doesn't fire when the pointer has already fired the up event",
	fn() {
		const draggable = new ExtendedDraggable(mockGizmoManager);
		draggable.pointerDown(mockPointer1, stubPointerEventData);
		draggable.pointerUp(mockPointer1);
		draggable.pointerMove(mockPointer2, stubPointerEventData);

		assertEquals(draggable.handlePointerMoveCalls, 0);
	},
});

Deno.test({
	name: "pointerUp is ignored when coming from another pointer device",
	fn() {
		const draggable = new ExtendedDraggable(mockGizmoManager);
		draggable.pointerDown(mockPointer1, stubPointerEventData);
		draggable.pointerUp(mockPointer2);
		draggable.pointerMove(mockPointer1, stubPointerEventData);

		assertEquals(draggable.handlePointerMoveCalls, 1);
		assertEquals(draggable.handlePointerUpCalls, 0);
	},
});

Deno.test({
	name: "fireDragCallbacks fires onDrag() callbacks",
	fn() {
		const draggable = new ExtendedDraggable(mockGizmoManager);
		/** @type {object[]} */
		const callbackEvents = [];
		/** @type {(e: object) => void} */
		const cb = e => {
			callbackEvents.push(e);
		};
		draggable.onDrag(cb);

		const event = {};
		draggable.fireDragCallbacks(event);

		assertEquals(callbackEvents.length, 1);
		assertStrictEquals(callbackEvents[0], event);
	},
});

Deno.test({
	name: "onDrag doesn't fire on removed event listeners",
	fn() {
		const draggable = new ExtendedDraggable(mockGizmoManager);
		/** @type {object[]} */
		const callbackEvents = [];
		/** @type {(e: object) => void} */
		const cb = e => {
			callbackEvents.push(e);
		};

		draggable.onDrag(cb);
		draggable.fireDragCallbacks({});
		assertEquals(callbackEvents.length, 1);

		draggable.removeOnDrag(cb);
		draggable.fireDragCallbacks({});
		assertEquals(callbackEvents.length, 1);
	},
});
