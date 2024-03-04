import { assertSpyCall, assertSpyCalls, spy } from "std/testing/mock.ts";
import { assertEquals } from "std/testing/asserts.ts";
import { GestureInProgressManager } from "../../../../../studio/src/misc/GestureInProgressManager.js";

/** @param {boolean} gestureInProgress */
const callbackSignature = gestureInProgress => {};

Deno.test({
	name: "Fires callback when it is registered",
	fn() {
		const manager = new GestureInProgressManager();

		const spyFn1 = spy(callbackSignature);

		manager.onGestureInProgressChange(spyFn1);
		assertSpyCalls(spyFn1, 1);
		assertSpyCall(spyFn1, 0, {
			args: [false],
		});

		manager.startGesture();
		const spyFn2 = spy(callbackSignature);
		manager.onGestureInProgressChange(spyFn2);
		assertSpyCalls(spyFn2, 1);
		assertSpyCall(spyFn2, 0, {
			args: [true],
		});
	},
});

Deno.test({
	name: "Fires callbacks when a gesture starts and stops",
	fn() {
		const manager = new GestureInProgressManager();

		const spyFn = spy(callbackSignature);
		manager.onGestureInProgressChange(spyFn);

		const { stopGesture } = manager.startGesture();
		assertSpyCalls(spyFn, 2);
		assertSpyCall(spyFn, 1, {
			args: [true],
		});

		stopGesture();
		assertSpyCalls(spyFn, 3);
		assertSpyCall(spyFn, 2, {
			args: [false],
		});

		// Does not fire when it is unregistered
		manager.removeOnGestureInProgressChange(spyFn);
		manager.startGesture();
		assertSpyCalls(spyFn, 3);
	},
});

Deno.test({
	name: "Does not fire callbacks when a gesture starts while another is already active",
	fn() {
		const manager = new GestureInProgressManager();

		const spyFn = spy(callbackSignature);
		manager.onGestureInProgressChange(spyFn);

		assertEquals(manager.gestureInProgress, false);

		const { stopGesture: stop1 } = manager.startGesture();
		assertEquals(manager.gestureInProgress, true);
		assertSpyCalls(spyFn, 2);

		const { stopGesture: stop2 } = manager.startGesture();
		assertEquals(manager.gestureInProgress, true);
		assertSpyCalls(spyFn, 2);

		stop2();
		assertEquals(manager.gestureInProgress, true);
		assertSpyCalls(spyFn, 2);

		stop1();
		assertEquals(manager.gestureInProgress, false);
		assertSpyCalls(spyFn, 3);
		assertSpyCall(spyFn, 2, {
			args: [false],
		});
	},
});
