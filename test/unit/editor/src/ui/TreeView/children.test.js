import {assertEquals} from "std/testing/asserts";
import "../../../shared/initializeEditor.js";
import {TreeView} from "../../../../../../editor/src/ui/TreeView.js";
import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";

Deno.test({
	name: "removeChild()",
	fn() {
		installFakeDocument();

		try {
			const treeView = new TreeView();
			const child1 = new TreeView({name: "child1"});
			treeView.addChild(child1);
			const child2 = new TreeView({name: "child2"});
			treeView.addChild(child2);
			const child3 = new TreeView({name: "child3"});
			treeView.addChild(child3);

			assertEquals(treeView.children.map(c => c.name), ["child1", "child2", "child3"]);
			treeView.removeChild(child2);
			assertEquals(treeView.children.map(c => c.name), ["child1", "child3"]);
		} finally {
			uninstallFakeDocument();
		}
	},
});
