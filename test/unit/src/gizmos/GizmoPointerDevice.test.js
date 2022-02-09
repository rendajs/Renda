import {assertEquals, assertExists} from "asserts";
import {GizmoPointerDevice} from "../../../../src/gizmos/GizmoPointerDevice.js";
import {Vec3} from "../../../../src/mod.js";
import {HtmlElement} from "../../shared/fakeDom/FakeHtmlElement.js";
import {PointerEvent} from "../../shared/fakeDom/FakePointerEvent.js";
import {installMockGetComputedStyle, uninstallMockGetComputedStyle} from "../../shared/fakeDom/mockGetComputedStyle.js";

class MockDraggable {
	constructor() {
		this.overCallCount = 0;
		this.outCallCount = 0;
	}
	pointerOver() {
		this.overCallCount++;
	}
	pointerOut() {
		this.outCallCount++;
	}
}

/**
 * The MockGizmoManager will hit any raycasts within -0.5 to 0.5.
 */
class MockGizmoManager {
	/**
	 * @param {any} camera
	 * @param {import("../../../../src/math/Vec3.js").Vec3Parameters} screenSpace
	 */
	raycastDraggables(camera, ...screenSpace) {
		const vec = new Vec3(...screenSpace);
		if (vec.x < -0.5 || vec.x > 0.5 || vec.y < -0.5 || vec.y > 0.5) {
			return null;
		}

		return new MockDraggable();
	}
}

const mockGizmoManager = /** @type {import("../../../../src/mod.js").GizmoManager} */ (new MockGizmoManager());
const stubCamera = /** @type {import("../../../../src/mod.js").CameraComponent} */ ({});

Deno.test({
	name: "destructor",
	fn() {
		const pointerDevice = new GizmoPointerDevice(mockGizmoManager);
		const mockDraggable = new MockDraggable();
		pointerDevice.currentlyHoveringDraggable = /** @type {any} */ (mockDraggable);

		pointerDevice.destructor();

		assertEquals(pointerDevice.destructed, true);
		assertEquals(mockDraggable.outCallCount, 1);
	},
});

Deno.test({
	name: "2d move event draggable over",
	fn() {
		installMockGetComputedStyle();

		const pointerDevice = new GizmoPointerDevice(mockGizmoManager);
		const stubElement = new HtmlElement({
			clientWidth: 100,
			clientHeight: 100,
		});
		const event = new PointerEvent("pointermove", {
			clientX: 50,
			clientY: 50,
		});

		pointerDevice.handle2dEvent(stubCamera, stubElement, event);

		assertExists(pointerDevice.currentlyHoveringDraggable);

		uninstallMockGetComputedStyle();
	},
});

Deno.test({
	name: "2d move event draggable out",
	fn() {
		installMockGetComputedStyle();

		const pointerDevice = new GizmoPointerDevice(mockGizmoManager);
		const stubElement = new HtmlElement({
			clientWidth: 100,
			clientHeight: 100,
		});
		const event1 = new PointerEvent("pointermove", {
			clientX: 50,
			clientY: 50,
		});
		pointerDevice.handle2dEvent(stubCamera, stubElement, event1);

		const event2 = new PointerEvent("pointermove", {
			clientX: 0,
			clientY: 0,
		});
		pointerDevice.handle2dEvent(stubCamera, stubElement, event2);

		assertEquals(pointerDevice.currentlyHoveringDraggable, null);

		uninstallMockGetComputedStyle();
	},
});
