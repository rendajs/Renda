import {assertEquals} from "std/testing/asserts.ts";
import {Entity, OrbitControls, Quat, Vec3} from "../../../../src/mod.js";
import {assertQuatAlmostEquals, assertVecAlmostEquals} from "../../shared/asserts.js";
import {runWithDom} from "../../studio/shared/runWithDom.js";
import {HtmlElement} from "fake-dom/FakeHtmlElement.js";
import {WheelEvent} from "fake-dom/FakeWheelEvent.js";

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
	name: "Wheel event with ctrl key adjusts the distance",
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
	name: "Wheel event with shift key adjusts the position",
	fn() {
		runWithDom(() => {
			const cam = new Entity();
			const el = new HtmlElement();
			const controls = new OrbitControls(cam, el);

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
	name: "Wheel event without keys adjusts the orbit",
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
			assertQuatAlmostEquals(controls.lookRot, Quat.fromAxisAngle(1, 0, 0, -0.01));

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
			assertQuatAlmostEquals(controls.lookRot, Quat.fromAxisAngle(0, 1, 0, -0.01));

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
