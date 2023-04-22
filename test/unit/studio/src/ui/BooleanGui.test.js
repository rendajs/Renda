import {assertSpyCall, assertSpyCalls} from "std/testing/mock.ts";
import {BooleanGui} from "../../../../../studio/src/ui/BooleanGui.js";
import {runWithDom} from "../../shared/runWithDom.js";
import {createOnChangeEventSpy} from "./shared.js";
import {assertEquals} from "std/testing/asserts.ts";

Deno.test({
	name: "Setting to true by user",
	fn() {
		runWithDom(() => {
			const gui = new BooleanGui();
			const changeSpy = createOnChangeEventSpy(gui);

			gui.el.checked = true;
			gui.el.dispatchEvent(new Event("change"));

			assertSpyCalls(changeSpy, 1);
			assertSpyCall(changeSpy, 0, {
				args: [
					{
						value: true,
						trigger: "user",
					},
				],
			});

			assertEquals(gui.value, true);
		});
	},
});

Deno.test({
	name: "Events don't fire after being destructed",
	fn() {
		runWithDom(() => {
			const gui = new BooleanGui();
			const changeSpy = createOnChangeEventSpy(gui);

			const el = gui.el;
			gui.destructor();

			el.checked = true;
			el.dispatchEvent(new Event("change"));

			assertSpyCalls(changeSpy, 0);
		});
	},
});
