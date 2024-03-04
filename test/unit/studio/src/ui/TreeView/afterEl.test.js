import "../../../shared/initializeStudio.js";
import { TreeView } from "../../../../../../studio/src/ui/TreeView.js";
import { HtmlElement } from "fake-dom/FakeHtmlElement.js";
import { FocusEvent } from "fake-dom/FakeFocusEvent.js";
import { runWithDom } from "../../../shared/runWithDom.js";
import { assertEquals, assertInstanceOf } from "std/testing/asserts.ts";
import { injectMockStudioInstance } from "../../../../../../studio/src/studioInstance.js";

/**
 * @param {() => void} fn
 */
function basictest(fn) {
	runWithDom(() => {
		const mockStudio = /** @type {import("../../../../../../studio/src/Studio.js").Studio} */ ({
			colorizerFilterManager: {
				applyFilter(element, cssColor) {
					element.dataset.currentColorFilter = cssColor;
				},
			},
		});
		const originalNode = globalThis.Node;
		globalThis.Node = /** @type {any} */ (HtmlElement);
		injectMockStudioInstance(mockStudio);
		try {
			fn();
		} finally {
			injectMockStudioInstance(null);
			globalThis.Node = originalNode;
		}
	});
}

Deno.test({
	name: "addIcon() adds an icon",
	fn() {
		basictest(() => {
			const treeView = new TreeView();
			treeView.addIcon("icon1");

			assertEquals(treeView.afterEl.childElementCount, 1);
			const iconEl = treeView.afterEl.children[0];
			assertInstanceOf(iconEl, HtmlElement);
			assertEquals(iconEl.style.backgroundImage, "url(icon1)");
		});
	},
});

Deno.test({
	name: "icon colors change when selected",
	fn() {
		basictest(() => {
			const treeView = new TreeView();
			treeView.addIcon("icon1");
			treeView.addIcon("icon2");
			assertEquals(treeView.afterEl.childElementCount, 2);

			/**
			 * @param {string} cssColor
			 */
			function assertColor(cssColor) {
				for (const iconEl of treeView.afterEl.children) {
					assertInstanceOf(iconEl, HtmlElement);

					assertEquals(iconEl.dataset.currentColorFilter, cssColor);
				}
			}

			assertColor("var(--default-button-text-color)");

			treeView.select();
			treeView.el.dispatchEvent(new FocusEvent("focusin"));
			assertColor("var(--selected-text-color)");

			treeView.el.dispatchEvent(new FocusEvent("focusout"));
			assertColor("var(--default-button-text-color)");
		});
	},
});
