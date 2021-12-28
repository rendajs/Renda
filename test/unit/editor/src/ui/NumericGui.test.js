import {assertEquals} from "https://deno.land/std@0.118.0/testing/asserts.ts";
import {NumericGui} from "../../../../../editor/src/UI/NumericGui.js";
import {initializeDom} from "../../shared/initializeDom.js";

Deno.test({
	name: "Hide cursor when scrolling",
	sanitizeOps: false,
	sanitizeResources: false,
	fn: () => {
		const window = initializeDom();
		const numericGui = new NumericGui();

		const wheelEvent = new window.WheelEvent("wheel", {deltaY: 1});
		numericGui.el.dispatchEvent(wheelEvent);

		assertEquals(numericGui.el.classList.contains("no-cursor"), true);
	},
});

Deno.test({
	name: "Show the cursor when moving mouse after scrolling",
	sanitizeOps: false,
	sanitizeResources: false,
	fn: () => {
		const window = initializeDom();
		const numericGui = new NumericGui();

		const wheelEvent = new window.WheelEvent("wheel", {deltaY: 1});
		numericGui.el.dispatchEvent(wheelEvent);
		const mouseEvent = new window.MouseEvent("mousemove");
		numericGui.el.dispatchEvent(mouseEvent);

		assertEquals(numericGui.el.classList.contains("no-cursor"), false);
	},
});

