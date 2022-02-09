import {assertEquals, assertStrictEquals, assertThrows} from "asserts";
import {ListeningGizmoPointerElement} from "../../../../src/gizmos/ListeningGizmoPointerElement.js";
import {HtmlElement} from "../../shared/fakeDom/FakeHtmlElement.js";
import {PointerEvent} from "../../shared/fakeDom/FakePointerEvent.js";

function createMockGizmoManager() {
	/** @type {{mockDevice: unknown}[]} */
	const handle2dEventCalls = [];
	const mockGizmoManager = /** @type {import("../../../../src/gizmos/GizmoManager.js").GizmoManager} */ ({
		requestPointerDevice() {
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
	};
}

const stubElement = new HtmlElement();
const stubCamera = /** @type {import("../../../../src/mod.js").CameraComponent} */ ({});

Deno.test({
	name: "pointermove event",
	fn() {
		const {mockGizmoManager, getHandle2dEventCalls} = createMockGizmoManager();
		const pointerElement = new ListeningGizmoPointerElement(mockGizmoManager, stubElement, stubCamera);
		pointerElement.addEventListeners();

		const event = new PointerEvent("pointermove");
		pointerElement.onPointerEvent(event);

		assertEquals(getHandle2dEventCalls().length, 1);
	},
});

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
