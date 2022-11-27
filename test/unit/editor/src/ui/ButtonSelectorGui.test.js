import {assertEquals, assertThrows} from "std/testing/asserts.ts";
import {FakeMouseEvent} from "fake-dom/FakeMouseEvent.js";
import {ButtonSelectorGui} from "../../../../../editor/src/ui/ButtonSelectorGui.js";
import {runWithDom} from "../../shared/runWithDom.js";
import {assertSpyCall, assertSpyCalls, spy} from "std/testing/mock.ts";

/**
 * @param {ButtonSelectorGui} gui
 */
function createOnChangeSpy(gui) {
	/**
	 * @type {import("../../../../../editor/src/ui/ButtonSelectorGui.js").OnButtonselectorGuiValueChange}
	 */
	const fn = value => {};
	const spyFn = spy(fn);
	gui.onValueChange(spyFn);
	return spyFn;
}

Deno.test({
	name: "allowSelectNone true",
	fn() {
		runWithDom(() => {
			const gui = new ButtonSelectorGui({
				items: ["foo", "myVariable", "my_variable"],
				allowSelectNone: true,
			});
			const spyFn = createOnChangeSpy(gui);

			assertEquals(gui.value, null);
			assertEquals(gui.el.childElementCount, 3);

			const mouseEvent1 = new FakeMouseEvent("click");
			gui.el.children[1].dispatchEvent(mouseEvent1);
			assertEquals(gui.value, "myVariable");
			assertSpyCalls(spyFn, 1);
			assertSpyCall(spyFn, 0, {
				args: ["myVariable"],
			});

			const mouseEvent2 = new FakeMouseEvent("click");
			gui.el.children[2].dispatchEvent(mouseEvent2);
			assertEquals(gui.value, "my_variable");
			assertSpyCalls(spyFn, 2);
			assertSpyCall(spyFn, 1, {
				args: ["my_variable"],
			});

			const mouseEvent3 = new FakeMouseEvent("click");
			gui.el.children[2].dispatchEvent(mouseEvent3);
			assertEquals(gui.value, null);
			assertSpyCalls(spyFn, 3);
			assertSpyCall(spyFn, 2, {
				args: [null],
			});
		});
	},
});

Deno.test({
	name: "allowSelectNone false",
	fn() {
		runWithDom(() => {
			const gui = new ButtonSelectorGui({
				items: ["foo", "myVariable", "my_variable"],
			});
			const spyFn = createOnChangeSpy(gui);

			assertEquals(gui.value, "foo");
			assertEquals(gui.el.childElementCount, 3);

			const mouseEvent1 = new FakeMouseEvent("click");
			gui.el.children[1].dispatchEvent(mouseEvent1);
			assertEquals(gui.value, "myVariable");
			assertSpyCalls(spyFn, 1);
			assertSpyCall(spyFn, 0, {
				args: ["myVariable"],
			});

			const mouseEvent2 = new FakeMouseEvent("click");
			gui.el.children[1].dispatchEvent(mouseEvent2);
			assertEquals(gui.value, "myVariable");
			assertSpyCalls(spyFn, 1);
		});
	},
});

Deno.test({
	name: "list of items",
	fn() {
		runWithDom(() => {
			const gui = new ButtonSelectorGui({
				items: [
					{
						text: "Hello",
					},
					{
						text: "spaces spaces",
						icon: "path/to/icon.svg",
					},
				],
				allowSelectNone: true,
			});
			const spyFn = createOnChangeSpy(gui);

			assertEquals(gui.value, null);

			const mouseEvent1 = new FakeMouseEvent("click");
			gui.el.children[0].dispatchEvent(mouseEvent1);
			assertEquals(gui.value, 0);
			assertSpyCalls(spyFn, 1);
			assertSpyCall(spyFn, 0, {
				args: [0],
			});

			const mouseEvent2 = new FakeMouseEvent("click");
			gui.el.children[1].dispatchEvent(mouseEvent2);
			assertEquals(gui.value, 1);
			assertSpyCalls(spyFn, 2);
			assertSpyCall(spyFn, 1, {
				args: [1],
			});

			const mouseEvent3 = new FakeMouseEvent("click");
			gui.el.children[1].dispatchEvent(mouseEvent3);
			assertEquals(gui.value, null);
			assertSpyCalls(spyFn, 3);
			assertSpyCall(spyFn, 2, {
				args: [null],
			});
		});
	},
});

Deno.test({
	name: "setValue()",
	fn() {
		runWithDom(() => {
			const gui1 = new ButtonSelectorGui({
				items: ["a", "b", "c"],
				allowSelectNone: true,
			});
			const spyFn1 = createOnChangeSpy(gui1);

			gui1.setValue(2);
			assertEquals(gui1.value, "c");

			gui1.setValue(-5);
			assertEquals(gui1.value, null);

			gui1.setValue(0);
			assertEquals(gui1.value, "a");

			gui1.setValue(100);
			assertEquals(gui1.value, null);

			gui1.setValue("b");
			assertEquals(gui1.value, "b");

			gui1.setValue("does not exist");
			assertEquals(gui1.value, null);

			gui1.setValue("a");
			gui1.setValue(null);
			assertEquals(gui1.value, null);

			assertSpyCalls(spyFn1, 0);

			const gui2 = new ButtonSelectorGui({
				items: ["a", "b", "c"],
			});

			assertThrows(() => {
				gui2.setValue(null);
			}, Error, `null" is not a valid value for this selector gui`);

			assertThrows(() => {
				gui2.setValue(-10);
			}, Error, `-10" is not a valid value for this selector gui`);

			gui2.setValue("b");
			assertEquals(gui2.value, "b");

			assertThrows(() => {
				gui2.setValue(100);
			}, Error, `100" is not a valid value for this selector gui`);
		});
	},
});
