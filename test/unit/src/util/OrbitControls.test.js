import { assertEquals } from "std/testing/asserts.ts";
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

Deno.test({
	name: "Has the right default location",
	fn() {
		const cam = new Entity();
		const controls = new OrbitControls(cam);
		assertVecAlmostEquals(controls.lookPos, [0, 0, 0]);
		assertQuatAlmostEquals(controls.lookRot, new Quat());
		assertEquals(controls.lookDist, 3);
	},
});

Deno.test({
	name: "Setting location via setter",
	fn() {
		const cam = new Entity();
		const controls = new OrbitControls(cam);

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
	name: "scrollBehavior is set to zoom by default",
	fn() {
		runWithDom(() => {
			const cam = new Entity();
			const el = new HtmlElement();
			const controls = new OrbitControls(cam, el);

			assertLoopCall(controls);

			el.dispatchEvent(new WheelEvent("wheel", {
				deltaY: 1,
			}));

			assertLoopCall(controls);
			assertEquals(controls.lookDist, 3.01);

			el.dispatchEvent(new WheelEvent("wheel", {
				deltaX: 1,
			}));

			assertLoopCall(controls);
			assertEquals(controls.lookDist, 3.01);
		});
	},
});

Deno.test({
	name: "Settings scrollBehavior to zoom causes wheel event to adjusts the distance",
	fn() {
		runWithDom(() => {
			const cam = new Entity();
			const el = new HtmlElement();
			const controls = new OrbitControls(cam, el);
			controls.scrollBehavior = "zoom";

			assertLoopCall(controls);

			el.dispatchEvent(new WheelEvent("wheel", {
				deltaY: 1,
			}));

			assertLoopCall(controls);
			assertEquals(controls.lookDist, 3.01);

			el.dispatchEvent(new WheelEvent("wheel", {
				deltaX: 1,
			}));

			assertLoopCall(controls);
			assertEquals(controls.lookDist, 3.01);
		});
	},
});

Deno.test({
	name: "Wheel events with DOM_DELTA_LINE and DOM_DELTA_PAGE are normalized",
	fn() {
		runWithDom(() => {
			const cam = new Entity();
			const el = new HtmlElement();
			const controls = new OrbitControls(cam, el);
			controls.scrollBehavior = "zoom";

			assertLoopCall(controls);

			el.dispatchEvent(new WheelEvent("wheel", {
				deltaY: 1,
				deltaMode: WheelEvent.DOM_DELTA_LINE,
			}));

			assertLoopCall(controls);
			assertEquals(controls.lookDist, 3.08);

			el.dispatchEvent(new WheelEvent("wheel", {
				deltaY: 1,
				deltaMode: WheelEvent.DOM_DELTA_PAGE,
			}));

			assertLoopCall(controls);
			assertEquals(controls.lookDist, 3.44);
		});
	},
});

Deno.test({
	name: "Settings scrollBehavior to orbit causes wheel event with ctrl key to adjusts the distance",
	fn() {
		runWithDom(() => {
			const cam = new Entity();
			const el = new HtmlElement();
			const controls = new OrbitControls(cam, el);

			assertLoopCall(controls);

			el.dispatchEvent(new WheelEvent("wheel", {
				deltaY: 1,
				ctrlKey: true,
			}));

			assertLoopCall(controls);
			assertEquals(controls.lookDist, 3.01);

			el.dispatchEvent(new WheelEvent("wheel", {
				deltaX: 1,
				ctrlKey: true,
			}));

			assertLoopCall(controls);
			assertEquals(controls.lookDist, 3.01);
		});
	},
});

Deno.test({
	name: "Settings scrollBehavior to orbit causes wheel event with shift key to adjusts the position",
	fn() {
		runWithDom(() => {
			const cam = new Entity();
			const el = new HtmlElement();
			const controls = new OrbitControls(cam, el);
			controls.scrollBehavior = "orbit";

			assertLoopCall(controls);

			el.dispatchEvent(new WheelEvent("wheel", {
				deltaY: 1,
				shiftKey: true,
			}));

			assertLoopCall(controls);
			assertVecAlmostEquals(controls.lookPos, [0, -0.01, 0]);

			el.dispatchEvent(new WheelEvent("wheel", {
				deltaX: 1,
				shiftKey: true,
			}));

			assertLoopCall(controls);
			assertVecAlmostEquals(controls.lookPos, [0.01, -0.01, 0]);
		});
	},
});

Deno.test({
	name: "Settings scrollBehavior to orbit causes wheel event without keys to adjusts the orbit",
	fn() {
		runWithDom(() => {
			const cam = new Entity();
			const el = new HtmlElement();
			const controls = new OrbitControls(cam, el);
			controls.scrollBehavior = "orbit";

			assertLoopCall(controls);

			el.dispatchEvent(new WheelEvent("wheel", {
				deltaY: 1,
			}));
			assertLoopCall(controls);
			assertQuatAlmostEquals(controls.lookRot, Quat.fromAxisAngle(1, 0, 0, 0.01));

			controls.invertScrollY = true;
			el.dispatchEvent(new WheelEvent("wheel", {
				deltaY: 1,
			}));
			assertLoopCall(controls);
			assertQuatAlmostEquals(controls.lookRot, Quat.identity);

			el.dispatchEvent(new WheelEvent("wheel", {
				deltaX: 1,
			}));
			assertLoopCall(controls);
			assertQuatAlmostEquals(controls.lookRot, Quat.fromAxisAngle(0, 1, 0, 0.01));

			controls.invertScrollX = true;
			el.dispatchEvent(new WheelEvent("wheel", {
				deltaX: 1,
			}));
			assertLoopCall(controls);
			assertQuatAlmostEquals(controls.lookRot, Quat.identity);
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
			const controls = new OrbitControls(cam, el1);
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
			const el = new HtmlElement();
			const controls = new OrbitControls(cam, el);

			assertLoopCall(controls);

			el.dispatchEvent(new PointerEvent("pointerdown", {
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
