import {ArrayGui} from "../../../../../studio/src/ui/ArrayGui.js";
import {runWithDom} from "../../shared/runWithDom.js";
import {assertSpyCall, assertSpyCalls} from "std/testing/mock.ts";
import {createOnChangeEventSpy} from "./shared.js";

Deno.test({
	name: "Triggers user events when adding and removing items",
	fn() {
		runWithDom(() => {
			const gui = new ArrayGui({
				arrayType: "number",
				arrayGuiOpts: {
					min: 1,
					max: 3,
				},
			});
			const changeSpy = createOnChangeEventSpy(gui);

			gui.addItemButton.click();
			assertSpyCalls(changeSpy, 1);
			assertSpyCall(changeSpy, 0, {
				args: [
					{
						value: [1],
						trigger: "user",
					},
				],
			});

			gui.removeItemButton.click();
			assertSpyCalls(changeSpy, 2);
			assertSpyCall(changeSpy, 1, {
				args: [
					{
						value: [],
						trigger: "user",
					},
				],
			});
		});
	},
});
