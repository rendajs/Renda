import {assertEquals} from "std/testing/asserts.ts";
import {stub} from "std/testing/mock.ts";
import {NumericGui} from "../../../../../studio/src/ui/NumericGui.js";
import {runWithDom} from "../../shared/runWithDom.js";
import {WheelEvent} from "fake-dom/FakeWheelEvent.js";
import {MouseEvent} from "fake-dom/FakeMouseEvent.js";
import {FocusEvent} from "fake-dom/FakeFocusEvent.js";
import {injectMockStudioInstance} from "../../../../../studio/src/studioInstance.js";
import {KeyboardShortcutManager} from "../../../../../studio/src/keyboardShortcuts/KeyboardShortcutManager.js";

/**
 * @typedef NumericGuiTestContext
 * @property {KeyboardShortcutManager} keyboardShortcutManager
 */

/**
 * @param {(ctx: NumericGuiTestContext) => void} fn
 */
function basicTest(fn) {
	runWithDom(() => {
		const keyboardShortcutManager = new KeyboardShortcutManager();
		keyboardShortcutManager.registerCommand({
			command: "numericGui.incrementAtCaret",
		});
		keyboardShortcutManager.registerCommand({
			command: "numericGui.decrementAtCaret",
		});
		keyboardShortcutManager.registerCondition("numericGui.hasFocus", {type: "boolean"});
		const studio = /** @type {import("../../../../../studio/src/Studio.js").Studio} */ ({
			keyboardShortcutManager,
		});
		injectMockStudioInstance(studio);
		try {
			fn({keyboardShortcutManager});
		} finally {
			injectMockStudioInstance(null);
		}
	});
}

Deno.test({
	name: "Hide cursor when scrolling",
	fn: () => {
		basicTest(() => {
			const numericGui = new NumericGui();
			stub(numericGui.el, "blur");

			const wheelEvent = new WheelEvent("wheel", {deltaY: 1});
			numericGui.el.dispatchEvent(wheelEvent);

			assertEquals(numericGui.el.classList.contains("no-cursor"), true);
		});
	},
});

Deno.test({
	name: "Show the cursor when moving mouse after scrolling",
	fn: () => {
		basicTest(() => {
			const numericGui = new NumericGui();
			stub(numericGui.el, "blur");

			const wheelEvent = new WheelEvent("wheel", {deltaY: 1});
			numericGui.el.dispatchEvent(wheelEvent);
			const mouseEvent = new MouseEvent("mousemove");
			numericGui.el.dispatchEvent(mouseEvent);

			assertEquals(numericGui.el.classList.contains("no-cursor"), false);
		});
	},
});

Deno.test({
	name: "Focus updates shortcut condition",
	fn() {
		basicTest(({keyboardShortcutManager}) => {
			const condition = keyboardShortcutManager.getCondition("numericGui.hasFocus");

			const numericGui1 = new NumericGui();
			stub(numericGui1.el, "setSelectionRange");
			const numericGui2 = new NumericGui();
			stub(numericGui2.el, "setSelectionRange");

			numericGui1.el.dispatchEvent(new FocusEvent("focus"));
			assertEquals(condition.value, true);

			numericGui2.el.dispatchEvent(new FocusEvent("focus"));
			assertEquals(condition.value, true);

			numericGui1.el.dispatchEvent(new FocusEvent("blur"));
			assertEquals(condition.value, true);

			numericGui2.el.dispatchEvent(new FocusEvent("blur"));
			assertEquals(condition.value, false);
		});
	},
});

Deno.test({
	name: "Adjusts value using arrow keys",
	fn() {
		basicTest(({keyboardShortcutManager}) => {
			const numericGui = new NumericGui();
			stub(numericGui.el, "setSelectionRange");

			// @ts-ignore
			document.activeElement = numericGui.el;
			numericGui.el.selectionStart = 0;
			numericGui.el.dispatchEvent(new FocusEvent("focus"));

			keyboardShortcutManager.fireCommand("numericGui.incrementAtCaret");
			assertEquals(numericGui.value, 1);

			keyboardShortcutManager.fireCommand("numericGui.decrementAtCaret");
			assertEquals(numericGui.value, 0);
		});
	},
});
