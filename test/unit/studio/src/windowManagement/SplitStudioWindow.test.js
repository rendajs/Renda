import { SplitStudioWindow } from "../../../../../studio/src/windowManagement/SplitStudioWindow.js";
import { runWithDom } from "../../shared/runWithDom.js";
import { MouseEvent } from "fake-dom/FakeMouseEvent.js";
import { GestureInProgressManager } from "../../../../../studio/src/misc/GestureInProgressManager.js";
import { assertEquals } from "std/testing/asserts.ts";
import { injectMockStudioInstance } from "../../../../../studio/src/studioInstance.js";

/**
 * @typedef SplitStudioWindowTestContext
 * @property {SplitStudioWindow} studioWindow
 * @property {import("../../../../../studio/src/Studio.js").Studio} studio
 */

/**
 * @param {object} options
 * @param {(ctx: SplitStudioWindowTestContext) => void} options.fn
 */
function basicTest({
	fn,
}) {
	const mockStudio = /** @type {import("../../../../../studio/src/Studio.js").Studio} */ ({
		gestureInProgressManager: new GestureInProgressManager(),
	});
	injectMockStudioInstance(mockStudio);
	runWithDom(() => {
		try {
			const mockWindowManager = /** @type {import("../../../../../studio/src/windowManagement/WindowManager.js").WindowManager} */ ({});
			const studioWindow = new SplitStudioWindow(mockWindowManager);
			fn({ studioWindow, studio: mockStudio });
		} finally {
			injectMockStudioInstance(null);
		}
	});
}

Deno.test({
	name: "Starts a GestureInProgress when resizing",
	fn() {
		basicTest({
			fn({ studioWindow, studio }) {
				let callCount = 0;
				studio.gestureInProgressManager.onGestureInProgressChange(() => callCount++);
				assertEquals(callCount, 1);

				studioWindow.resizer.dispatchEvent(new MouseEvent("mousedown"));
				assertEquals(callCount, 2);
				assertEquals(studio.gestureInProgressManager.gestureInProgress, true);

				// Dispatch again to ensure no events fire
				studioWindow.resizer.dispatchEvent(new MouseEvent("mousedown"));
				assertEquals(callCount, 2);
				assertEquals(studio.gestureInProgressManager.gestureInProgress, true);

				window.dispatchEvent(new MouseEvent("mouseup"));
				assertEquals(callCount, 3);
				assertEquals(studio.gestureInProgressManager.gestureInProgress, false);

				window.dispatchEvent(new MouseEvent("mouseup"));
				assertEquals(callCount, 3);
				assertEquals(studio.gestureInProgressManager.gestureInProgress, false);
			},
		});
	},
});

Deno.test({
	name: "Stops current GestureInProgress when destructed",
	fn() {
		basicTest({
			fn({ studioWindow, studio }) {
				studioWindow.resizer.dispatchEvent(new MouseEvent("mousedown"));
				assertEquals(studio.gestureInProgressManager.gestureInProgress, true);

				studioWindow.destructor();
				assertEquals(studio.gestureInProgressManager.gestureInProgress, false);
			},
		});
	},
});
