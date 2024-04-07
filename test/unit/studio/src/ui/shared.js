import { spy } from "std/testing/mock.ts";
import { assert, assertEquals } from "std/testing/asserts.ts";

/**
 * @template {import("../../../../../studio/src/ui/propertiesTreeView/PropertiesTreeViewEntry.js").GuiInterface} T
 * @param {T} gui
 */
export function createOnChangeEventSpy(gui) {
	/** @typedef {import("../../../../../studio/src/ui/propertiesTreeView/types.ts").GetValueType<T>} ValueReturnType */
	/** @type {(event: import("../../../../../studio/src/ui/propertiesTreeView/types.ts").GuiInterfaceValueChangeEvent<ValueReturnType>) => void} */
	const spyFn = () => {};
	const changeSpy = spy(spyFn);
	if (!gui.onValueChange) {
		throw new Error("This gui type does not support the 'onValueChange' function.");
	}
	gui.onValueChange(changeSpy);
	return changeSpy;
}

/**
 * @param {Element} el
 */
export function assertIsSpinnerEl(el) {
	assertEquals(el.tagName, "DIV");
	assert(el.classList.contains("spinner"), "Expected the element to be a spinner");
}
