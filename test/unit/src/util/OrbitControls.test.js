import { assertEquals, assertThrows } from "std/testing/asserts.ts";
import { assertSpyCalls, stub } from "std/testing/mock.ts";
import { Entity, OrbitControls, Quat, Vec3 } from "../../../../src/mod.js";
import { assertQuatAlmostEquals, assertVecAlmostEquals } from "../../../../src/util/asserts.js";
import { runWithDom as runWithDomPartial } from "../../studio/shared/runWithDom.js";
import { HtmlElement } from "fake-dom/FakeHtmlElement.js";
import { WheelEvent } from "fake-dom/FakeWheelEvent.js";
import { PointerEvent } from "fake-dom/FakePointerEvent.js";

/**
 * @param {() => void} fn
 */
function runWithDom(fn) {
	runWithDomPartial(() => {
		const oldWheelEvent = globalThis.WheelEvent;
		globalThis.WheelEvent = WheelEvent;

		try {
			fn();
		} finally {
			globalThis.WheelEvent = oldWheelEvent;
		}
	});
}

/**
 * After making a change, the transform should be dirty.
 * But calling loop a second time without any changes should not trigger any computations.
 * @param {OrbitControls} controls
 */
function assertLoopCall(controls) {
	assertEquals(controls.loop(), true);
	assertEquals(controls.loop(), false);
}

/**
 * Asserts that a deltaY wheel event causes zooming and a deltaX event is ignored.
 * @param {HTMLElement} eventElement
 * @param {OrbitControls} controls
 * @param {WheelEventInit} [wheelEventInitExtra]
 */
function assertWheelChangesLookDist(eventElement, controls, wheelEventInitExtra) {
	eventElement.dispatchEvent(new WheelEvent("wheel", {
		deltaY: 1,
		...wheelEventInitExtra,
	}));

	assertLoopCall(controls);
	assertEquals(controls.lookDist, 3.01);

	eventElement.dispatchEvent(new WheelEvent("wheel", {
		deltaX: 1,
		ctrlKey: true,
		...wheelEventInitExtra,
	}));

	assertLoopCall(controls);
	assertEquals(controls.lookDist, 3.01);
}

/**
 * Asserts that a both a deltaY and deltaX wheel event causes panning.
 * @param {HTMLElement} eventElement
 * @param {OrbitControls} controls
 * @param {WheelEventInit} [wheelEventInitExtra]
 */
function assertWheelChangesPosition(eventElement, controls, wheelEventInitExtra) {
	eventElement.dispatchEvent(new WheelEvent("wheel", {
		deltaY: 1,
		...wheelEventInitExtra,
	}));

	assertLoopCall(controls);
	assertVecAlmostEquals(controls.lookPos, [0, -0.01, 0]);

	eventElement.dispatchEvent(new WheelEvent("wheel", {
		deltaX: 1,
		...wheelEventInitExtra,
	}));

	assertLoopCall(controls);
	assertVecAlmostEquals(controls.lookPos, [0.01, -0.01, 0]);
}

/**
 * Asserts that a both a deltaY and deltaX wheel event causes changing the orbit.
 * @param {HTMLElement} eventElement
 * @param {OrbitControls} controls
 * @param {WheelEventInit} [wheelEventInitExtra]
 */
function assertWheelChangesOrbit(eventElement, controls, wheelEventInitExtra) {
	eventElement.dispatchEvent(new WheelEvent("wheel", {
		deltaY: 1,
		...wheelEventInitExtra,
	}));
	assertLoopCall(controls);
	assertQuatAlmostEquals(controls.lookRot, Quat.fromAxisAngle(1, 0, 0, 0.01));

	controls.invertScrollY = true;
	eventElement.dispatchEvent(new WheelEvent("wheel", {
		deltaY: 1,
		...wheelEventInitExtra,
	}));
	assertLoopCall(controls);
	assertQuatAlmostEquals(controls.lookRot, Quat.identity);

	eventElement.dispatchEvent(new WheelEvent("wheel", {
		deltaX: 1,
		...wheelEventInitExtra,
	}));
	assertLoopCall(controls);
	assertQuatAlmostEquals(controls.lookRot, Quat.fromAxisAngle(0, 1, 0, 0.01));

	controls.invertScrollX = true;
	eventElement.dispatchEvent(new WheelEvent("wheel", {
		deltaX: 1,
		...wheelEventInitExtra,
	}));
	assertLoopCall(controls);
	assertQuatAlmostEquals(controls.lookRot, Quat.identity);
}

function createMockScrollHardwareDetector() {
	/**
	 * @typedef Extras
	 * @property {(type: import("../../../../src/util/ScrollHardwareDetector.js").ScrollHardwareType) => void} setEstimatedType
	 */

	/** @type {import("../../../../src/util/ScrollHardwareDetector.js").ScrollHardwareType} */
	let estimatedType = "unknown";

	const detector = /** @type {import("../../../../src/mod.js").ScrollHardwareDetector & Extras} */ ({
		get estimatedType() {
			return estimatedType;
		},
		handleWheelEvent(event) {},
		setEstimatedType(type) {
			estimatedType = type;
		},
	});
	return detector;
}

function basicSetup() {
	const cam = new Entity();
	const eventElement = new HtmlElement();
	const scrollHardwareDetector = createMockScrollHardwareDetector();
	const controls = new OrbitControls(cam, {
		eventElement,
		scrollHardwareDetector,
	});
	return { cam, eventElement, scrollHardwareDetector, controls };
}

Deno.test({
	name: "Has the right default location",
	fn() {
		const cam = new Entity();
		const controls = new OrbitControls(cam, { scrollHardwareDetector: createMockScrollHardwareDetector() });
		assertVecAlmostEquals(controls.lookPos, [0, 0, 0]);
		assertQuatAlmostEquals(controls.lookRot, new Quat());
		assertEquals(controls.lookDist, 3);
	},
});

Deno.test({
	name: "Setting location via setter",
	fn() {
		const cam = new Entity();
		const controls = new OrbitControls(cam, { scrollHardwareDetector: createMockScrollHardwareDetector() });

		// First loop is always dirty
		assertLoopCall(controls);

		controls.lookPos.set(1, 2, 3);
		assertLoopCall(controls);

		controls.lookPos = new Vec3(4, 5, 6);
		assertLoopCall(controls);

		controls.lookDist = 123;
		assertLoopCall(controls);

		controls.lookRot.set(Quat.fromAxisAngle(1, 2, 3, Math.PI));
		assertLoopCall(controls);

		controls.lookRot = Quat.fromAxisAngle(4, 5, 6, -Math.PI);
		assertLoopCall(controls);
	},
});

Deno.test({
	name: "Setting scrollHardwareDetector to null without setting scrollBehavior throws",
	fn() {
		const cam = new Entity();
		assertThrows(() => {
			new OrbitControls(cam, {
				scrollHardwareDetector: null,
			});
		}, Error, "scrollHardwareDetector was set to null but no scrollBehavior was configured. Set `scrollBehavior` to something other than 'auto' (which is the default).");
	},
});

Deno.test({
	name: "Setting scrollHardwareDetector to null while setting scrollBehavior to 'auto' throws",
	fn() {
		const cam = new Entity();
		assertThrows(() => {
			new OrbitControls(cam, {
				scrollHardwareDetector: null,
				scrollBehavior: "auto",
			});
		}, Error, "scrollBehavior was set to 'auto' but scrollHardwareDetector was explicitly set to null. Automatic scroll mode detection requires a ScrollHardwareDetector.");
	},
});

Deno.test({
	name: "Setting scrollBehavior to 'auto' without a ScrollHardwareDetector throws",
	fn() {
		const cam = new Entity();
		const controls = new OrbitControls(cam, {
			scrollHardwareDetector: null,
			scrollBehavior: "orbit",
		});
		assertThrows(() => {
			controls.scrollBehavior = "auto";
		}, Error, "Can't set scrollBehavior to 'auto' because `scrollHardwareDetector` was explicitly set to null in the constructor.");
	},
});

Deno.test({
	name: "scrollBehavior is set to auto by default",
	fn() {
		runWithDom(() => {
			const { controls } = basicSetup();
			assertEquals(controls.scrollBehavior, "auto");
		});
	},
});

Deno.test({
	name: "Setting scrollBehavior to zoom causes wheel event to adjusts the distance",
	fn() {
		runWithDom(() => {
			const { eventElement, scrollHardwareDetector, controls } = basicSetup();
			scrollHardwareDetector.setEstimatedType("touchpad");
			controls.scrollBehavior = "zoom";

			assertLoopCall(controls);
			assertWheelChangesLookDist(eventElement, controls);
		});
	},
});

Deno.test({
	name: "Setting scrollBehavior to orbit causes wheel event with ctrl key to adjusts the distance",
	fn() {
		runWithDom(() => {
			const { eventElement, scrollHardwareDetector, controls } = basicSetup();
			scrollHardwareDetector.setEstimatedType("mouse");
			controls.scrollBehavior = "orbit";

			assertLoopCall(controls);
			assertWheelChangesLookDist(eventElement, controls, { ctrlKey: true });
		});
	},
});

Deno.test({
	name: "Estimated type is touchpad causes wheel event with ctrl key to adjusts the distance",
	fn() {
		runWithDom(() => {
			const { eventElement, scrollHardwareDetector, controls } = basicSetup();
			scrollHardwareDetector.setEstimatedType("touchpad");

			assertLoopCall(controls);
			assertWheelChangesLookDist(eventElement, controls, { ctrlKey: true });
		});
	},
});

Deno.test({
	name: "Wheel events with DOM_DELTA_LINE and DOM_DELTA_PAGE are normalized",
	fn() {
		runWithDom(() => {
			const cam = new Entity();
			const eventElement = new HtmlElement();
			const controls = new OrbitControls(cam, {
				eventElement,
				scrollHardwareDetector: createMockScrollHardwareDetector(),
			});
			controls.scrollBehavior = "zoom";

			assertLoopCall(controls);

			eventElement.dispatchEvent(new WheelEvent("wheel", {
				deltaY: 1,
				deltaMode: WheelEvent.DOM_DELTA_LINE,
			}));

			assertLoopCall(controls);
			assertEquals(controls.lookDist, 3.08);

			eventElement.dispatchEvent(new WheelEvent("wheel", {
				deltaY: 1,
				deltaMode: WheelEvent.DOM_DELTA_PAGE,
			}));

			assertLoopCall(controls);
			assertEquals(controls.lookDist, 3.44);
		});
	},
});

Deno.test({
	name: "Setting scrollBehavior to orbit causes wheel event with shift key to adjusts the position",
	fn() {
		runWithDom(() => {
			const { eventElement, scrollHardwareDetector, controls } = basicSetup();
			scrollHardwareDetector.setEstimatedType("mouse");
			controls.scrollBehavior = "orbit";

			assertLoopCall(controls);
			assertWheelChangesPosition(eventElement, controls, { shiftKey: true });
		});
	},
});

Deno.test({
	name: "Setting scrollBehavior to orbit causes wheel event without keys to adjusts the orbit",
	fn() {
		runWithDom(() => {
			const { eventElement, scrollHardwareDetector, controls } = basicSetup();
			scrollHardwareDetector.setEstimatedType("mouse");
			controls.scrollBehavior = "orbit";

			assertLoopCall(controls);
			assertWheelChangesOrbit(eventElement, controls);
		});
	},
});

Deno.test({
	name: "Touchpads change the orbit when scrollbehavior is auto",
	fn() {
		runWithDom(() => {
			const { eventElement, scrollHardwareDetector, controls } = basicSetup();
			scrollHardwareDetector.setEstimatedType("touchpad");
			controls.scrollBehavior = "auto";

			assertLoopCall(controls);
			assertWheelChangesOrbit(eventElement, controls);
		});
	},
});

Deno.test({
	name: "Mice change the zoom when scrollbehavior is auto",
	fn() {
		runWithDom(() => {
			const { eventElement, scrollHardwareDetector, controls } = basicSetup();
			scrollHardwareDetector.setEstimatedType("mouse");
			controls.scrollBehavior = "auto";

			assertLoopCall(controls);
			assertWheelChangesLookDist(eventElement, controls);
		});
	},
});

Deno.test({
	name: "Scrolling changes the zoom when estimated hardware type is unknown",
	fn() {
		runWithDom(() => {
			const { eventElement, scrollHardwareDetector, controls } = basicSetup();
			scrollHardwareDetector.setEstimatedType("unknown");
			controls.scrollBehavior = "auto";

			assertLoopCall(controls);
			assertWheelChangesLookDist(eventElement, controls);
		});
	},
});

Deno.test({
	name: "Destructor removes registered listeners",
	fn() {
		runWithDom(() => {
			const cam = new Entity();
			const el1 = new HtmlElement();
			const el2 = new HtmlElement();
			const controls = new OrbitControls(cam, {
				eventElement: el1,
				scrollHardwareDetector: createMockScrollHardwareDetector(),
			});
			controls.addEventElement(el2);

			assertLoopCall(controls);

			el1.dispatchEvent(new WheelEvent("wheel", {
				deltaY: 1,
			}));
			assertLoopCall(controls);

			el2.dispatchEvent(new WheelEvent("wheel", {
				deltaY: 1,
			}));
			assertLoopCall(controls);

			controls.destructor();

			el1.dispatchEvent(new WheelEvent("wheel", {
				deltaY: 1,
			}));
			el2.dispatchEvent(new WheelEvent("wheel", {
				deltaY: 1,
			}));

			assertEquals(controls.loop(), false);
		});
	},
});

Deno.test({
	name: "Orbit using pointer click",
	fn() {
		runWithDom(() => {
			const setCaptureSpy = stub(document.body, "setPointerCapture");
			const cam = new Entity();
			const eventElement = new HtmlElement();
			const controls = new OrbitControls(cam, {
				eventElement,
				scrollHardwareDetector: createMockScrollHardwareDetector(),
			});

			assertLoopCall(controls);

			eventElement.dispatchEvent(new PointerEvent("pointerdown", {
				clientX: 10,
				clientY: 10,
				button: 1,
			}));

			document.body.dispatchEvent(new PointerEvent("pointermove", {
				clientX: 10,
				clientY: 20,
				ctrlKey: true,
			}));
			assertLoopCall(controls);
			assertEquals(controls.lookDist, 2.9);
			assertSpyCalls(setCaptureSpy, 1);

			document.body.dispatchEvent(new PointerEvent("pointerup", {
			}));

			document.body.dispatchEvent(new PointerEvent("pointermove", {
				clientX: 10,
				clientY: 30,
				ctrlKey: true,
			}));
			assertEquals(controls.lookDist, 2.9);
		});
	},
});
