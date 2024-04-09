import { assertEquals } from "std/testing/asserts.ts";
import { ScrollHardwareDetector } from "../../../../src/util/ScrollHardwareDetector.js";
import { WheelEvent } from "fake-dom/FakeWheelEvent.js";

/**
 * @typedef ScrollHardwareDetectorTestContext
 * @property {EventTarget} eventTarget
 * @property {(ms: number) => void} tick Move `performance.now()` forward in time.
 */

/**
 * @param {object} options
 * @param {(ctx: ScrollHardwareDetectorTestContext) => void} options.fn
 */
function setupTest({ fn }) {
	const oldDocument = globalThis.document;
	const oldWheelEvent = globalThis.WheelEvent;
	const oldPerformanceNow = performance.now;
	try {
		globalThis.document = /** @type {Document} */ ({
			body: new EventTarget(),
		});
		globalThis.WheelEvent = WheelEvent;
		let now = 0;
		performance.now = () => {
			return now;
		};
		fn({
			eventTarget: document.body,
			tick(ms) {
				now += ms;
			},
		});
	} finally {
		globalThis.document = oldDocument;
		globalThis.WheelEvent = oldWheelEvent;
		performance.now = oldPerformanceNow;
	}
}

Deno.test({
	name: "estimatedType is unknown by default",
	fn() {
		setupTest({
			fn() {
				const detector = new ScrollHardwareDetector();
				assertEquals(detector.estimatedType, "unknown");
			},
		});
	},
});

Deno.test({
	name: "destructor unregisters events",
	fn() {
		setupTest({
			fn({ eventTarget }) {
				const detector1 = new ScrollHardwareDetector();
				detector1.destructor();

				// detector2 serves as a sanity check to see if the test isn't outdated.
				const detector2 = new ScrollHardwareDetector();

				eventTarget.dispatchEvent(new WheelEvent("wheel", {
					deltaY: 1,
					deltaMode: WheelEvent.DOM_DELTA_LINE,
				}));
				assertEquals(detector1.estimatedType, "unknown");
				assertEquals(detector2.estimatedType, "mouse");
			},
		});
	},
});

Deno.test({
	name: "Scrolling with any deltaMode other than DOM_DELTA_PIXEL detects a mouse",
	fn() {
		setupTest({
			fn({ eventTarget }) {
				const detector1 = new ScrollHardwareDetector();

				eventTarget.dispatchEvent(new WheelEvent("wheel", {
					deltaY: 1,
					deltaMode: WheelEvent.DOM_DELTA_LINE,
				}));
				assertEquals(detector1.estimatedType, "mouse");
				detector1.destructor();

				const detector2 = new ScrollHardwareDetector();

				eventTarget.dispatchEvent(new WheelEvent("wheel", {
					deltaY: 1,
					deltaMode: WheelEvent.DOM_DELTA_PAGE,
				}));
				assertEquals(detector2.estimatedType, "mouse");
			},
		});
	},
});

Deno.test({
	name: "Scrolling on the x axis detects a touchpad",
	fn() {
		setupTest({
			fn({ eventTarget }) {
				const detector = new ScrollHardwareDetector();

				eventTarget.dispatchEvent(new WheelEvent("wheel", {
					deltaX: 1,
				}));
				assertEquals(detector.estimatedType, "touchpad");
			},
		});
	},
});

Deno.test({
	name: "scrolling one pixel or less detects a touchpad",
	fn() {
		setupTest({
			fn({ eventTarget }) {
				const detector = new ScrollHardwareDetector();

				eventTarget.dispatchEvent(new WheelEvent("wheel", {
					deltaY: 1,
				}));
				assertEquals(detector.estimatedType, "touchpad");
			},
		});
	},
});

Deno.test({
	name: "scrolling ten pixels or more detects a mouse",
	fn() {
		setupTest({
			fn({ eventTarget }) {
				const detector = new ScrollHardwareDetector();

				eventTarget.dispatchEvent(new WheelEvent("wheel", {
					deltaY: 10,
				}));
				assertEquals(detector.estimatedType, "mouse");
			},
		});
	},
});

Deno.test({
	name: "Once a hardware type has been determined, it doesn't change until the next gesture",
	fn() {
		setupTest({
			fn({ eventTarget, tick }) {
				const detector = new ScrollHardwareDetector();

				eventTarget.dispatchEvent(new WheelEvent("wheel", {
					deltaY: 1,
				}));
				assertEquals(detector.estimatedType, "touchpad");

				eventTarget.dispatchEvent(new WheelEvent("wheel", {
					deltaY: 10,
				}));
				assertEquals(detector.estimatedType, "touchpad");

				tick(1000);
				eventTarget.dispatchEvent(new WheelEvent("wheel", {
					deltaY: 10,
				}));
				assertEquals(detector.estimatedType, "mouse");
			},
		});
	},
});

Deno.test({
	name: "DOM_DELTA_PAGE doesn't keep switching between mouse and touchpad",
	fn() {
		setupTest({
			fn({ eventTarget, tick }) {
				const detector = new ScrollHardwareDetector();

				eventTarget.dispatchEvent(new WheelEvent("wheel", {
					deltaY: 1,
					deltaMode: WheelEvent.DOM_DELTA_PAGE,
				}));
				assertEquals(detector.estimatedType, "mouse");

				tick(1000);

				eventTarget.dispatchEvent(new WheelEvent("wheel", {
					deltaY: 1,
					deltaMode: WheelEvent.DOM_DELTA_PAGE,
				}));
				assertEquals(detector.estimatedType, "mouse");
			},
		});
	},
});

Deno.test({
	name: "if after 7 events still no device has been detected, fall back to mouse",
	fn() {
		setupTest({
			fn({ eventTarget }) {
				const detector = new ScrollHardwareDetector();

				for (let i = 0; i < 7; i++) {
					eventTarget.dispatchEvent(new WheelEvent("wheel", {
						deltaY: 5,
					}));
				}
				assertEquals(detector.estimatedType, "unknown");

				eventTarget.dispatchEvent(new WheelEvent("wheel", {
					deltaY: 5,
				}));
				assertEquals(detector.estimatedType, "mouse");
			},
		});
	},
});

Deno.test({
	name: "Duplicate wheel events are ignored",
	fn() {
		setupTest({
			fn({ eventTarget }) {
				const detector = new ScrollHardwareDetector();

				for (let i = 0; i < 7; i++) {
					const event = new WheelEvent("wheel", {
						deltaY: 5,
					});
					eventTarget.dispatchEvent(event);
					detector.handleWheelEvent(event);
				}
				assertEquals(detector.estimatedType, "unknown");

				eventTarget.dispatchEvent(new WheelEvent("wheel", {
					deltaY: 5,
				}));
				assertEquals(detector.estimatedType, "mouse");
			},
		});
	},
});
