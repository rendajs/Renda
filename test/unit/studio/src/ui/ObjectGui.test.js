import {assertInstanceOf} from "std/testing/asserts.ts";
import {ObjectGui} from "../../../../../studio/src/ui/ObjectGui.js";
import {createOnChangeEventSpy} from "./shared.js";
import {PropertiesTreeViewEntry} from "../../../../../studio/src/ui/propertiesTreeView/PropertiesTreeViewEntry.js";
import {runWithDom} from "../../shared/runWithDom.js";
import {NumericGui} from "../../../../../studio/src/ui/NumericGui.js";
import {assertSpyCall, assertSpyCalls} from "std/testing/mock.ts";

Deno.test({
	name: "Fires events when user changes a value",
	fn() {
		runWithDom(() => {
			const gui = new ObjectGui({
				structure: {
					foo: {
						type: "number",
					},
				},
			});
			const onChangeSpy = createOnChangeEventSpy(gui);

			const numberEntry = gui.treeView.children[0];
			assertInstanceOf(numberEntry, PropertiesTreeViewEntry);
			const numberGui = numberEntry.gui;
			assertInstanceOf(numberGui, NumericGui);
			numberGui.setValue(3, {trigger: "user"});

			assertSpyCalls(onChangeSpy, 1);
			assertSpyCall(onChangeSpy, 0, {
				args: [
					{
						value: {
							foo: 3,
						},
						trigger: "user",
					},
				],
			});
		});
	},
});
