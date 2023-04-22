import {assertEquals} from "std/testing/asserts.ts";
import {assertSpyCalls} from "std/testing/mock.ts";
import {VectorGui} from "../../../../../studio/src/ui/VectorGui.js";
import {runWithDom} from "../../shared/runWithDom.js";
import {createOnChangeEventSpy} from "./shared.js";
import {assertVecAlmostEquals} from "../../../shared/asserts.js";

Deno.test({
	name: "Fires events when user changes the value",
	fn() {
		runWithDom(() => {
			const gui = new VectorGui();
			const changeSpy = createOnChangeEventSpy(gui);

			gui.numericGuis[0].setValue(3, {
				trigger: "user",
			});
			assertSpyCalls(changeSpy, 1);
			assertEquals(changeSpy.calls[0].args[0].trigger, "user");
			assertVecAlmostEquals(changeSpy.calls[0].args[0].value, [3, 0, 0]);
		});
	},
});
