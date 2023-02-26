import {assertEquals} from "std/testing/asserts.ts";
import {stub} from "std/testing/mock.ts";
import {NumericGui} from "../../../../../studio/src/ui/NumericGui.js";
import { runWithDom } from "../../shared/runWithDom.js";
import {WheelEvent} from "fake-dom/FakeWheelEvent.js";
import {MouseEvent} from "fake-dom/FakeMouseEvent.js";

Deno.test({
	name: "Hide cursor when scrolling",
	fn: () => {
		runWithDom(() => {
			const numericGui = new NumericGui();
			stub(numericGui.el, "blur");

			const wheelEvent = new WheelEvent("wheel", {deltaY: 1});
			numericGui.el.dispatchEvent(wheelEvent);

			assertEquals(numericGui.el.classList.contains("no-cursor"), true);
		})
	},
});

Deno.test({
	name: "Show the cursor when moving mouse after scrolling",
	fn: () => {
		runWithDom(() => {
			const numericGui = new NumericGui();
			stub(numericGui.el, "blur");

			const wheelEvent = new WheelEvent("wheel", {deltaY: 1});
			numericGui.el.dispatchEvent(wheelEvent);
			const mouseEvent = new MouseEvent("mousemove");
			numericGui.el.dispatchEvent(mouseEvent);

			assertEquals(numericGui.el.classList.contains("no-cursor"), false);
		})
	},
});

