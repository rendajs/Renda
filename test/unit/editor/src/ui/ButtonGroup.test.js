import {assertEquals} from "std/testing/asserts.ts";
import {Button} from "../../../../../editor/src/ui/Button.js";
import {ButtonGroup} from "../../../../../editor/src/ui/ButtonGroup.js";
import {runWithDom} from "../../shared/runWithDom.js";

Deno.test({
	name: "Adding and removing buttons and visibility",
	fn() {
		runWithDom(() => {
			const group = new ButtonGroup();

			const button1 = new Button();
			group.addButton(button1);
			const button2 = new Button();
			group.addButton(button2);
			const button3 = new Button();
			group.addButton(button3);

			assertEquals(group.el.childElementCount, 3);

			/**
			 * @param {string} className
			 * @param {[boolean, boolean, boolean]} containsState
			 */
			function testClasses(className, containsState) {
				assertEquals(button1.el.classList.contains(className), containsState[0], `Expected button 1 to ${containsState[0] ? "" : "not "}contain "${className}"`);
				assertEquals(button2.el.classList.contains(className), containsState[1], `Expected button 2 to ${containsState[0] ? "" : "not "}contain "${className}"`);
				assertEquals(button3.el.classList.contains(className), containsState[2], `Expected button 3 to ${containsState[0] ? "" : "not "}contain "${className}"`);
			}

			testClasses("hidden", [false, false, false]);
			testClasses("first-visible-child", [true, false, false]);
			testClasses("last-visible-child", [false, false, true]);

			button1.setVisibility(false);
			testClasses("hidden", [true, false, false]);
			testClasses("first-visible-child", [false, true, false]);
			testClasses("last-visible-child", [false, false, true]);

			button3.setVisibility(false);
			testClasses("hidden", [true, false, true]);
			testClasses("first-visible-child", [false, true, false]);
			testClasses("last-visible-child", [false, true, false]);

			button2.setVisibility(false);
			testClasses("hidden", [true, true, true]);
			testClasses("first-visible-child", [false, false, false]);
			testClasses("last-visible-child", [false, false, false]);

			button1.setVisibility(true);
			testClasses("hidden", [false, true, true]);
			testClasses("first-visible-child", [true, false, false]);
			testClasses("last-visible-child", [true, false, false]);

			button2.setVisibility(true);
			button3.setVisibility(true);
			testClasses("hidden", [false, false, false]);
			testClasses("first-visible-child", [true, false, false]);
			testClasses("last-visible-child", [false, false, true]);

			group.removeButton(0);
			testClasses("first-visible-child", [true, true, false]);
			testClasses("last-visible-child", [false, false, true]);

			group.removeButton(10); // doesn't exist: no-op
			testClasses("first-visible-child", [true, true, false]);
			testClasses("last-visible-child", [false, false, true]);
		});
	},
});
