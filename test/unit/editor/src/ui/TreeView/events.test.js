import {assertEquals, assertStrictEquals} from "std/testing/asserts.ts";
import {assertSpyCalls, spy} from "std/testing/mock.ts";
import "../../../shared/initializeEditor.js";
import {TreeView} from "../../../../../../editor/src/ui/TreeView.js";
import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";
import {FakeMouseEvent} from "fake-dom/FakeMouseEvent.js";

Deno.test({
	name: "collapsedchange",
	fn() {
		installFakeDocument();

		try {
			const spyFn = spy(/** @param {import("../../../../../../editor/src/ui/TreeView.js").TreeViewCollapseEvent} e */ e => {});
			const treeView = new TreeView();
			const child = new TreeView({name: "child"});
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
			const childSpyFn = spy(/** @param {import("../../../../../../editor/src/ui/TreeView.js").TreeViewCollapseEvent} e */ e => {});
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
