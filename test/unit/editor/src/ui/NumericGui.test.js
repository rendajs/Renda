import {assertEquals} from "std/testing/asserts.ts";
import {NumericGui} from "../../../../../editor/src/ui/NumericGui.js";

Deno.test({
	name: "Hide cursor when scrolling",
	ignore: true,
	sanitizeOps: false,
	sanitizeResources: false,
	fn: () => {
		// const window = initializeDom();
		const numericGui = new NumericGui();

		const wheelEvent = new window.WheelEvent("wheel", {deltaY: 1});
		numericGui.el.dispatchEvent(wheelEvent);

		assertEquals(numericGui.el.classList.contains("no-cursor"), true);
	},
});

Deno.test({
	name: "Show the cursor when moving mouse after scrolling",
	ignore: true,
	sanitizeOps: false,
	sanitizeResources: false,
	fn: () => {
		// const window = initializeDom();
		const numericGui = new NumericGui();

		const wheelEvent = new window.WheelEvent("wheel", {deltaY: 1});
		numericGui.el.dispatchEvent(wheelEvent);
		const mouseEvent = new window.MouseEvent("mousemove");
		numericGui.el.dispatchEvent(mouseEvent);

		assertEquals(numericGui.el.classList.contains("no-cursor"), false);
	},
});

