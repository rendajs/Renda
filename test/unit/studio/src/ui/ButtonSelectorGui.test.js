import {assertEquals, assertThrows} from "std/testing/asserts.ts";
import {FakeMouseEvent} from "fake-dom/FakeMouseEvent.js";
import {ButtonSelectorGui} from "../../../../../studio/src/ui/ButtonSelectorGui.js";
import {runWithDom} from "../../shared/runWithDom.js";
import {assertSpyCall, assertSpyCalls, spy} from "std/testing/mock.ts";
import {assertIsType} from "../../../shared/typeAssertions.js";

/**
 * @param {ButtonSelectorGui} gui
 */
function createOnChangeSpy(gui) {
	/**
	 * @type {import("../../../../../studio/src/ui/ButtonSelectorGui.js").OnButtonselectorGuiValueChange}
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

			// Type assertions
			{
				const expectedDefaultType = /** @type {string | number | null} */ (null);

				const guiValue1 = gui.value;
				assertIsType(expectedDefaultType, guiValue1);
				// @ts-expect-error Ensure the value type is not 'any'
				assertIsType(true, guiValue1);

				const guiValue2 = gui.getValue();
				assertIsType(expectedDefaultType, guiValue2);
				// @ts-expect-error Ensure the value type is not 'any'
				assertIsType(true, guiValue2);

				const guiValue3 = gui.getValue({purpose: "default"});
				assertIsType(expectedDefaultType, guiValue3);
				// @ts-expect-error Ensure the value type is not 'any'
				assertIsType(true, guiValue3);

				const expectedIndexType = /** @type {number | null} */ (null);

				const indexValue1 = gui.getValue({getIndex: true});
				assertIsType(expectedIndexType, indexValue1);
				// @ts-expect-error Ensure the value type is not 'any'
				assertIsType("", indexValue1);

				const indexValue2 = gui.getValue({purpose: "binarySerialization"});
				assertIsType(expectedIndexType, indexValue2);
				// @ts-expect-error Ensure the value type is not 'any'
				assertIsType("", indexValue2);
			}

			assertEquals(gui.value, null);
			assertEquals(gui.getValue(), null);
			assertEquals(gui.getValue({purpose: "default"}), null);
			assertEquals(gui.getValue({purpose: "binarySerialization"}), null);
			assertEquals(gui.getValue({getIndex: true}), null);
			assertEquals(gui.el.childElementCount, 3);

			const mouseEvent1 = new FakeMouseEvent("click");
			gui.el.children[1].dispatchEvent(mouseEvent1);
			assertEquals(gui.value, "myVariable");
			assertEquals(gui.getValue(), "myVariable");
			assertEquals(gui.getValue({purpose: "default"}), "myVariable");
			assertEquals(gui.getValue({purpose: "binarySerialization"}), 1);
			assertEquals(gui.getValue({getIndex: true}), 1);
			assertSpyCalls(spyFn, 1);
			assertSpyCall(spyFn, 0, {
				args: [
					{
						value: "myVariable",
						trigger: "user",
					},
				],
			});

			const mouseEvent2 = new FakeMouseEvent("click");
			gui.el.children[2].dispatchEvent(mouseEvent2);
			assertEquals(gui.value, "my_variable");
			assertEquals(gui.getValue(), "my_variable");
			assertEquals(gui.getValue({purpose: "default"}), "my_variable");
			assertEquals(gui.getValue({purpose: "binarySerialization"}), 2);
			assertEquals(gui.getValue({getIndex: true}), 2);
			assertSpyCalls(spyFn, 2);
			assertSpyCall(spyFn, 1, {
				args: [
					{
						value: "my_variable",
						trigger: "user",
					},
				],
			});

			const mouseEvent3 = new FakeMouseEvent("click");
			gui.el.children[2].dispatchEvent(mouseEvent3);
			assertEquals(gui.value, null);
			assertEquals(gui.getValue(), null);
			assertEquals(gui.getValue({purpose: "default"}), null);
			assertEquals(gui.getValue({purpose: "binarySerialization"}), null);
			assertEquals(gui.getValue({getIndex: true}), null);
			assertSpyCalls(spyFn, 3);
			assertSpyCall(spyFn, 2, {
				args: [
					{
						value: null,
						trigger: "user",
					},
				],
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

			// Type assertions
			{
				const expectedDefaultType = /** @type {string | number} */ (3);

				const guiValue1 = gui.value;
				assertIsType(expectedDefaultType, guiValue1);
				// @ts-expect-error Ensure the value type is not 'any'
				assertIsType(true, guiValue1);

				const guiValue2 = gui.getValue();
				assertIsType(expectedDefaultType, guiValue2);
				// @ts-expect-error Ensure the value type is not 'any'
				assertIsType(true, guiValue2);

				const guiValue3 = gui.getValue({purpose: "default"});
				assertIsType(expectedDefaultType, guiValue3);
				// @ts-expect-error Ensure the value type is not 'any'
				assertIsType(true, guiValue3);

				const expectedIndexType = /** @type {number} */ (3);

				const indexValue1 = gui.getValue({getIndex: true});
				assertIsType(expectedIndexType, indexValue1);
				// @ts-expect-error Ensure the value type is not 'any'
				assertIsType("", indexValue1);

				const indexValue2 = gui.getValue({purpose: "binarySerialization"});
				assertIsType(expectedIndexType, indexValue2);
				// @ts-expect-error Ensure the value type is not 'any'
				assertIsType("", indexValue2);
			}

			assertEquals(gui.value, "foo");
			assertEquals(gui.getValue(), "foo");
			assertEquals(gui.getValue({purpose: "default"}), "foo");
			assertEquals(gui.getValue({purpose: "binarySerialization"}), 0);
			assertEquals(gui.getValue({getIndex: true}), 0);
			assertEquals(gui.el.childElementCount, 3);

			const mouseEvent1 = new FakeMouseEvent("click");
			gui.el.children[1].dispatchEvent(mouseEvent1);
			assertEquals(gui.value, "myVariable");
			assertEquals(gui.getValue(), "myVariable");
			assertEquals(gui.getValue({purpose: "default"}), "myVariable");
			assertEquals(gui.getValue({purpose: "binarySerialization"}), 1);
			assertEquals(gui.getValue({getIndex: true}), 1);
			assertSpyCalls(spyFn, 1);
			assertSpyCall(spyFn, 0, {
				args: [
					{
						value: "myVariable",
						trigger: "user",
					},
				],
			});

			const mouseEvent2 = new FakeMouseEvent("click");
			gui.el.children[1].dispatchEvent(mouseEvent2);
			assertEquals(gui.value, "myVariable");
			assertEquals(gui.getValue(), "myVariable");
			assertEquals(gui.getValue({purpose: "default"}), "myVariable");
			assertEquals(gui.getValue({purpose: "binarySerialization"}), 1);
			assertEquals(gui.getValue({getIndex: true}), 1);
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
				args: [
					{
						value: 0,
						trigger: "user",
					},
				],
			});

			const mouseEvent2 = new FakeMouseEvent("click");
			gui.el.children[1].dispatchEvent(mouseEvent2);
			assertEquals(gui.value, 1);
			assertSpyCalls(spyFn, 2);
			assertSpyCall(spyFn, 1, {
				args: [
					{
						value: 1,
						trigger: "user",
					},
				],
			});

			const mouseEvent3 = new FakeMouseEvent("click");
			gui.el.children[1].dispatchEvent(mouseEvent3);
			assertEquals(gui.value, null);
			assertSpyCalls(spyFn, 3);
			assertSpyCall(spyFn, 2, {
				args: [
					{
						value: null,
						trigger: "user",
					},
				],
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
