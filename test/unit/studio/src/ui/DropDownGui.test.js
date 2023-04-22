import {assertEquals} from "std/testing/asserts.ts";
import {DropDownGui} from "../../../../../studio/src/ui/DropDownGui.js";
import {runWithDom} from "../../shared/runWithDom.js";
import {createOnChangeEventSpy} from "./shared.js";
import {assertSpyCall, assertSpyCalls} from "std/testing/mock.ts";

Deno.test({
	name: "Creates the element with the correct defaultValue",
	fn() {
		runWithDom(() => {
			const gui = new DropDownGui({
				items: ["item1", "item2", "item3"],
				defaultValue: "item2",
			});

			assertEquals(gui.value, "item2");
		});
	},
});

Deno.test({
	name: "Changing values by the user",
	fn() {
		runWithDom(() => {
			const gui = new DropDownGui({
				items: ["item1", "item2", "item3"],
			});
			const changeSpy = createOnChangeEventSpy(gui);

			gui.el.value = "1";
			gui.el.selectedIndex = 1;
			gui.el.dispatchEvent(new Event("change"));

			assertEquals(gui.value, "item2");
			assertSpyCalls(changeSpy, 1);
			assertSpyCall(changeSpy, 0, {
				args: [
					{
						value: "item2",
						trigger: "user",
					},
				],
			});
		});
	},
});
