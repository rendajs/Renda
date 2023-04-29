import {assertEquals, assertExists} from "std/testing/asserts.ts";
import {GizmoPointerDevice} from "../../../../src/gizmos/GizmoPointerDevice.js";
import {Vec3} from "../../../../src/mod.js";
import {HtmlElement} from "fake-dom/FakeHtmlElement.js";
import {PointerEvent} from "fake-dom/FakePointerEvent.js";
import {installMockGetComputedStyle, uninstallMockGetComputedStyle} from "fake-dom/mockGetComputedStyle.js";

class MockDraggable {
	constructor() {
		this.overCallCount = 0;
		this.outCallCount = 0;
		this.downCallCount = 0;
		this.upCallCount = 0;
		this.moveCallCount = 0;
	}
	pointerOver() {
		this.overCallCount++;
	}
	pointerOut() {
		this.outCallCount++;
	}
	pointerDown() {
		this.downCallCount++;
	}
	pointerUp() {
		this.upCallCount++;
	}
	pointerMove() {
		this.moveCallCount++;
	}
}

/**
 * A MockGizmoManager will hit any raycasts within 0.25 to 0.75.
 * @param {(() => MockDraggable)?} createDraggableCb
 */
function createMockGizmoManager(createDraggableCb = null) {
	class MockGizmoManager {
		/**
		 * @param {any} camera
		 * @param {import("../../../../src/math/Vec3.js").Vec3Parameters} screenSpace
		 */
		raycastDraggables(camera, ...screenSpace) {
			const vec = new Vec3(...screenSpace);
			if (vec.x < 0.25 || vec.x > 0.75 || vec.y < 0.25 || vec.y > 0.75) {
				return null;
			}

			if (createDraggableCb) {
				return createDraggableCb();
			} else {
				return new MockDraggable();
			}
		}
	}
	return /** @type {import("../../../../src/mod.js").GizmoManager} */ (new MockGizmoManager());
}

function basicSetup() {
	installMockGetComputedStyle();
	const mockDraggable = new MockDraggable();
	const mockGizmoManager = createMockGizmoManager(() => {
		return mockDraggable;
	});
	const pointerDevice = new GizmoPointerDevice(mockGizmoManager);
	const stubElement = new HtmlElement({
		clientWidth: 100,
		clientHeight: 100,
	});
	const stubCamera = /** @type {import("../../../../src/mod.js").CameraComponent} */ ({});
	const castMockDraggable = /** @type {import("../../../../src/gizmos/draggables/GizmoDraggable.js").GizmoDraggable} */ (/** @type {unknown} */ (mockDraggable));
	return {
		castMockDraggable,
		mockDraggable,
		pointerDevice,
		stubElement,
		stubCamera,
		uninstall() {
			uninstallMockGetComputedStyle();
		},
	};
}

Deno.test({
	name: "destructor",
	fn() {
		const {pointerDevice, stubElement, stubCamera, mockDraggable, uninstall} = basicSetup();

		try {
			// Hover over a draggable
			const event1 = new PointerEvent("pointermove", {
				clientX: 50,
				clientY: 50,
			});
			pointerDevice.handle2dEvent(stubCamera, stubElement, event1);

			pointerDevice.destructor();

			assertEquals(pointerDevice.destructed, true);
			assertEquals(mockDraggable.outCallCount, 1);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "2d move event draggable over and out",
	fn() {
		const {pointerDevice, stubElement, stubCamera, mockDraggable, uninstall} = basicSetup();

		try {
			// Hover over a draggable
			const event1 = new PointerEvent("pointermove", {
				clientX: 50,
				clientY: 50,
			});
			pointerDevice.handle2dEvent(stubCamera, stubElement, event1);
			assertExists(pointerDevice.currentlyHoveringDraggable);
			assertEquals(mockDraggable.overCallCount, 1);
			assertEquals(mockDraggable.outCallCount, 0);

			// Hover away from the draggable
			const event2 = new PointerEvent("pointermove", {
				clientX: 0,
				clientY: 0,
			});
			pointerDevice.handle2dEvent(stubCamera, stubElement, event2);
			assertEquals(pointerDevice.currentlyHoveringDraggable, null);
			assertEquals(mockDraggable.outCallCount, 1);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "down and up events updates hasActiveButton",
	fn() {
		const {pointerDevice, stubElement, stubCamera, uninstall} = basicSetup();

		try {
			const event1 = new PointerEvent("pointerdown", {
				buttons: 1,
			});
			pointerDevice.handle2dEvent(stubCamera, stubElement, event1);
			assertEquals(pointerDevice.hasActiveButton, true);

			const event2 = new PointerEvent("pointerup", {
				buttons: 0,
			});
			pointerDevice.handle2dEvent(stubCamera, stubElement, event2);
			assertEquals(pointerDevice.hasActiveButton, false);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "down, up and move events notify draggables",
	fn() {
		const {pointerDevice, stubElement, stubCamera, mockDraggable, uninstall} = basicSetup();

		try {
			// Click on a draggable
			const event1 = new PointerEvent("pointerdown", {
				clientX: 50,
				clientY: 50,
				buttons: 1,
			});
			pointerDevice.handle2dEvent(stubCamera, stubElement, event1);
			assertEquals(pointerDevice.hasActiveButton, true);
			assertEquals(mockDraggable.downCallCount, 1);
			assertEquals(mockDraggable.upCallCount, 0);

			// Move slightly
			const event2 = new PointerEvent("pointermove", {
				clientX: 50,
				clientY: 51,
				buttons: 1,
			});
			pointerDevice.handle2dEvent(stubCamera, stubElement, event2);
			assertEquals(pointerDevice.hasActiveButton, true);
			assertEquals(mockDraggable.moveCallCount, 1);

			// Release mouse button
			const event3 = new PointerEvent("pointerup", {
				clientX: 50,
				clientY: 50,
				buttons: 0,
			});
			pointerDevice.handle2dEvent(stubCamera, stubElement, event3);
			assertEquals(pointerDevice.hasActiveButton, false);
			assertEquals(mockDraggable.upCallCount, 1);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "up event notifies active draggable, even when raycast misses",
	fn() {
		const {pointerDevice, stubElement, stubCamera, mockDraggable, uninstall} = basicSetup();

		try {
			// Click draggable
			const event1 = new PointerEvent("pointerdown", {
				clientX: 50,
				clientY: 50,
				buttons: 1,
			});
			pointerDevice.handle2dEvent(stubCamera, stubElement, event1);
			assertEquals(pointerDevice.hasActiveButton, true);
			assertEquals(mockDraggable.downCallCount, 1);
			assertEquals(mockDraggable.upCallCount, 0);

			// Move away from draggable
			const event2 = new PointerEvent("pointermove", {
				clientX: 0,
				clientY: 0,
				buttons: 1,
			});
			pointerDevice.handle2dEvent(stubCamera, stubElement, event2);

			// Release mouse button
			const event3 = new PointerEvent("pointerup", {
				clientX: 0,
				clientY: 0,
				buttons: 0,
			});
			pointerDevice.handle2dEvent(stubCamera, stubElement, event3);
			assertEquals(pointerDevice.hasActiveButton, false);
			assertEquals(mockDraggable.upCallCount, 1);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "forceDragDraggable keeps dragging even though the mouse isn't down",
	fn() {
		const {pointerDevice, stubElement, stubCamera, mockDraggable, castMockDraggable, uninstall} = basicSetup();

		try {
			// Move cursor to set an initial location for the pointer device
			const event1 = new PointerEvent("pointermove", {
				clientX: 0,
				clientY: 0,
				buttons: 0,
			});
			pointerDevice.handle2dEvent(stubCamera, stubElement, event1);
			assertEquals(mockDraggable.overCallCount, 0);
			assertEquals(mockDraggable.downCallCount, 0);

			pointerDevice.forceDragDraggable(castMockDraggable);
			assertEquals(mockDraggable.overCallCount, 1);
			assertEquals(mockDraggable.downCallCount, 1);

			// Move cursor while pointer is up from draggable
			const event2 = new PointerEvent("pointermove", {
				clientX: 0,
				clientY: 0,
				buttons: 0,
			});
			pointerDevice.handle2dEvent(stubCamera, stubElement, event2);
			assertEquals(pointerDevice.hasActiveButton, true);

			// Click to release the forced drag
			const event3 = new PointerEvent("pointerdown", {
				clientX: 0,
				clientY: 0,
				buttons: 1,
			});
			pointerDevice.handle2dEvent(stubCamera, stubElement, event3);
			assertEquals(mockDraggable.outCallCount, 0);
			assertEquals(mockDraggable.upCallCount, 0);

			const event4 = new PointerEvent("pointerup", {
				clientX: 0,
				clientY: 0,
				buttons: 0,
			});
			pointerDevice.handle2dEvent(stubCamera, stubElement, event4);
			assertEquals(mockDraggable.overCallCount, 1);
			assertEquals(mockDraggable.downCallCount, 1);
			assertEquals(mockDraggable.outCallCount, 1);
			assertEquals(mockDraggable.upCallCount, 1);
		} finally {
			uninstall();
		}
	},
});
