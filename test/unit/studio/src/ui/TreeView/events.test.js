import { assertEquals, assertStrictEquals } from "std/testing/asserts.ts";
import { assertSpyCalls, spy } from "std/testing/mock.ts";
import "../../../shared/initializeStudio.js";
import { TreeView } from "../../../../../../studio/src/ui/TreeView.js";
import { installFakeDocument, uninstallFakeDocument } from "fake-dom/FakeDocument.js";
import { FakeMouseEvent } from "fake-dom/FakeMouseEvent.js";
import { FakeFocusEvent } from "fake-dom/FakeFocusEvent.js";
import { HtmlElement } from "fake-dom/FakeHtmlElement.js";

Deno.test({
	name: "collapsedchange",
	fn() {
		installFakeDocument();

		try {
			const spyFn = spy(/** @param {import("../../../../../../studio/src/ui/TreeView.js").TreeViewCollapseEvent} e */ (e) => {});
			const treeView = new TreeView();
			const child = new TreeView({ name: "child" });
			treeView.addChild(child);
			treeView.addEventListener("collapsedchange", spyFn);

			// Collapse by clicking the arrow
			child.arrowContainerEl.dispatchEvent(new FakeMouseEvent("click"));
			assertSpyCalls(spyFn, 1);
			assertEquals(spyFn.calls[0].args[0].collapsed, true);
			assertStrictEquals(spyFn.calls[0].args[0].target, child);

			// Expand by calling `toggleCollapsed()`
			child.toggleCollapsed();
			assertSpyCalls(spyFn, 2);
			assertEquals(spyFn.calls[1].args[0].collapsed, false);
			assertStrictEquals(spyFn.calls[1].args[0].target, child);

			// Collapse by setting `collapsed` to true
			child.collapsed = true;
			assertSpyCalls(spyFn, 3);
			assertEquals(spyFn.calls[2].args[0].collapsed, true);
			assertStrictEquals(spyFn.calls[2].args[0].target, child);

			// Expand by setting `expanded` to true
			child.expanded = true;
			assertSpyCalls(spyFn, 4);
			assertEquals(spyFn.calls[3].args[0].collapsed, false);
			assertStrictEquals(spyFn.calls[3].args[0].target, child);

			// Setting `collapsed` to false should have no effect
			child.collapsed = false;
			assertSpyCalls(spyFn, 4);

			// Setting `expanded` to true should have no effect
			child.expanded = true;
			assertSpyCalls(spyFn, 4);

			// Events are fired on both the parent and the child
			const childSpyFn = spy(/** @param {import("../../../../../../studio/src/ui/TreeView.js").TreeViewCollapseEvent} e */ (e) => {});
			child.addEventListener("collapsedchange", childSpyFn);
			child.toggleCollapsed();
			assertSpyCalls(childSpyFn, 1);
			assertEquals(childSpyFn.calls[0].args[0].collapsed, true);
			assertStrictEquals(childSpyFn.calls[0].args[0].target, child);
		} finally {
			uninstallFakeDocument();
		}
	},
});

Deno.test({
	name: "focuswithinchange",
	fn() {
		installFakeDocument();
		const oldNode = globalThis.Node;
		globalThis.Node = /** @type {any} */ (HtmlElement);

		try {
			const spyFn = spy(/** @param {import("../../../../../../studio/src/ui/TreeView.js").TreeViewFocusWithinChangeEvent} e */ (e) => {});
			const childSpyFn = spy(/** @param {import("../../../../../../studio/src/ui/TreeView.js").TreeViewFocusWithinChangeEvent} e */ (e) => {});
			const treeView = new TreeView();
			const childTreeView = new TreeView({ name: "child" });
			treeView.addChild(childTreeView);
			treeView.addEventListener("focuswithinchange", spyFn);
			childTreeView.addEventListener("focuswithinchange", childSpyFn);

			// Focus within events should only fire on the root
			childTreeView.el.dispatchEvent(new FakeFocusEvent("focusin"));
			childTreeView.el.dispatchEvent(new FakeFocusEvent("focusout"));

			childTreeView.select();
			assertEquals(childTreeView.rowEl.classList.contains("selected"), true);
			assertEquals(childTreeView.rowEl.classList.contains("no-focus"), true);

			treeView.el.dispatchEvent(new FakeFocusEvent("focusin", {
				relatedTarget: null,
			}));
			assertSpyCalls(spyFn, 1);
			assertEquals(spyFn.calls[0].args[0].hasFocusWithin, true);
			assertStrictEquals(spyFn.calls[0].args[0].target, treeView);
			assertEquals(childTreeView.rowEl.classList.contains("selected"), true);
			assertEquals(childTreeView.rowEl.classList.contains("no-focus"), false);

			// No events should fire when the focus changes between two elements within the treeview
			treeView.el.dispatchEvent(new FakeFocusEvent("focusout", {
				relatedTarget: childTreeView.el,
			}));
			treeView.el.dispatchEvent(new FakeFocusEvent("focusin", {
				relatedTarget: null,
			}));
			assertSpyCalls(spyFn, 1);

			treeView.el.dispatchEvent(new FakeFocusEvent("focusout"));
			assertSpyCalls(spyFn, 2);
			assertEquals(spyFn.calls[1].args[0].hasFocusWithin, false);
			assertStrictEquals(spyFn.calls[1].args[0].target, treeView);
			assertEquals(childTreeView.rowEl.classList.contains("selected"), true);
			assertEquals(childTreeView.rowEl.classList.contains("no-focus"), true);

			assertSpyCalls(childSpyFn, 0);
		} finally {
			uninstallFakeDocument();
			globalThis.Node = oldNode;
		}
	},
});
