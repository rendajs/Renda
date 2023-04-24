import {assertSpyCall, assertSpyCalls} from "std/testing/mock.ts";
import {TextGui} from "../../../../../studio/src/ui/TextGui.js";
import {runWithDom} from "../../shared/runWithDom.js";
import {createOnChangeEventSpy} from "./shared.js";

Deno.test({
	name: "Fires events when changed by user",
	fn() {
		runWithDom(() => {
			const gui = new TextGui();
			const changeSpy = createOnChangeEventSpy(gui);

			gui.el.value = "hello";
			gui.el.dispatchEvent(new Event("change"));

			assertSpyCalls(changeSpy, 1);
			assertSpyCall(changeSpy, 0, {
				args: [
					{
						value: "hello",
						trigger: "user",
					},
				],
			});
		});
	},
});

Deno.test({
	name: "Fires events when changed by application",
	fn() {
		runWithDom(() => {
			const gui = new TextGui();
			const changeSpy = createOnChangeEventSpy(gui);

			gui.setValue("hello");

			assertSpyCalls(changeSpy, 1);
			assertSpyCall(changeSpy, 0, {
				args: [
					{
						value: "hello",
						trigger: "application",
					},
				],
			});
		});
	},
});
