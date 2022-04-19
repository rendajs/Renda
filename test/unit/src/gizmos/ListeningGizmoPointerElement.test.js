import {assertEquals, assertStrictEquals, assertThrows} from "std/testing/asserts";
import {ListeningGizmoPointerElement} from "../../../../src/gizmos/ListeningGizmoPointerElement.js";
import {HtmlElement} from "fake-dom/FakeHtmlElement.js";
import {PointerEvent} from "fake-dom/FakePointerEvent.js";

function createMockGizmoManager() {
	/** @type {{mockDevice: unknown}[]} */
	const handle2dEventCalls = [];
	let createdDeviceCount = 0;
	const mockGizmoManager = /** @type {import("../../../../src/gizmos/GizmoManager.js").GizmoManager} */ ({
		requestPointerDevice() {
			createdDeviceCount++;
			const mockDevice = /** @type {import("../../../../src/gizmos/GizmoPointerDevice.js").GizmoPointerDevice} */ ({
				handle2dEvent(camera, element, event) {
					handle2dEventCalls.push({mockDevice});
				},
			});
			return mockDevice;
		},
	});
	return {
		mockGizmoManager,
		getHandle2dEventCalls() {
			return handle2dEventCalls;
		},
		getCreatedDeviceCount() {
			return createdDeviceCount;
		},
	};
}

const stubElement = new HtmlElement();
const stubCamera = /** @type {import("../../../../src/mod.js").CameraComponent} */ ({});

Deno.test({
	name: "onPointerEvent throws when not listening",
	fn() {
		const {mockGizmoManager} = createMockGizmoManager();
		const pointerElement = new ListeningGizmoPointerElement(mockGizmoManager, stubElement, stubCamera);

		const event = new PointerEvent("pointermove");

		assertThrows(() => {
			pointerElement.onPointerEvent(event);
		});

		pointerElement.addEventListeners();
		pointerElement.removeEventListeners();

		assertThrows(() => {
			pointerElement.onPointerEvent(event);
		});
	},
});

Deno.test({
	name: "multiple pointermove events uses the same pointer device",
	fn() {
		const {mockGizmoManager, getHandle2dEventCalls} = createMockGizmoManager();
		const pointerElement = new ListeningGizmoPointerElement(mockGizmoManager, stubElement, stubCamera);
		pointerElement.addEventListeners();

		const event1 = new PointerEvent("pointermove");
		pointerElement.onPointerEvent(event1);

		const event2 = new PointerEvent("pointermove");
		pointerElement.onPointerEvent(event2);

		const calls = getHandle2dEventCalls();
		assertEquals(calls.length, 2);
		assertStrictEquals(calls[0].mockDevice, calls[1].mockDevice);
	},
});

Deno.test({
	name: "create multiple pointer devices for different pointerIds",
	fn() {
		const {mockGizmoManager, getCreatedDeviceCount} = createMockGizmoManager();
		const pointerElement = new ListeningGizmoPointerElement(mockGizmoManager, stubElement, stubCamera);
		pointerElement.addEventListeners();

		const event1 = new PointerEvent("pointermove", {pointerId: 1});
		pointerElement.onPointerEvent(event1);

		const event2 = new PointerEvent("pointermove", {pointerId: 2});
		pointerElement.onPointerEvent(event2);

		const deviceCount = getCreatedDeviceCount();
		assertEquals(deviceCount, 2);
	},
});

Deno.test({
	name: "pointermove event gets passed on to the pointer device",
	fn() {
		const {mockGizmoManager, getHandle2dEventCalls} = createMockGizmoManager();
		const pointerElement = new ListeningGizmoPointerElement(mockGizmoManager, stubElement, stubCamera);
		pointerElement.addEventListeners();

		const event = new PointerEvent("pointermove");
		stubElement.dispatchEvent(event);

		assertEquals(getHandle2dEventCalls().length, 1);
	},
});

Deno.test({
	name: "pointerdown event gets passed on to the pointer device",
	fn() {
		const {mockGizmoManager, getHandle2dEventCalls} = createMockGizmoManager();
		const pointerElement = new ListeningGizmoPointerElement(mockGizmoManager, stubElement, stubCamera);
		pointerElement.addEventListeners();

		const event = new PointerEvent("pointerdown");
		stubElement.dispatchEvent(event);

		assertEquals(getHandle2dEventCalls().length, 1);
	},
});

Deno.test({
	name: "pointerup event gets passed on to the pointer device",
	fn() {
		const {mockGizmoManager, getHandle2dEventCalls} = createMockGizmoManager();
		const pointerElement = new ListeningGizmoPointerElement(mockGizmoManager, stubElement, stubCamera);
		pointerElement.addEventListeners();

		const event = new PointerEvent("pointerup");
		stubElement.dispatchEvent(event);

		assertEquals(getHandle2dEventCalls().length, 1);
	},
});
