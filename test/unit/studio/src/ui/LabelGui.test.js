import { assertEquals } from "std/testing/asserts.ts";
import { LabelGui } from "../../../../../studio/src/ui/LabelGui.js";
import { runWithDom } from "../../shared/runWithDom.js";

Deno.test({
	name: "value updates the label",
	fn() {
		runWithDom(() => {
			const gui = new LabelGui();

			gui.value = "test";
			assertEquals(gui.el.textContent, "test");
			assertEquals(gui.value, "test");
		});
	},
});

Deno.test({
	name: "Tooltip updates the tooltip",
	fn() {
		runWithDom(() => {
			const gui = new LabelGui();

			gui.tooltip = "test";
			assertEquals(gui.el.title, "test");
			assertEquals(gui.tooltip, "test");
		});
	},
});
