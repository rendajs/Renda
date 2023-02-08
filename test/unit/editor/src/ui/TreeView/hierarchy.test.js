import {assertEquals} from "std/testing/asserts.ts";
import "../../../shared/initializeEditor.js";
import {TreeView} from "../../../../../../editor/src/ui/TreeView.js";
import {runWithDom} from "../../../shared/runWithDom.js";

Deno.test({
	name: "removeChild()",
	fn() {
		runWithDom(() => {
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
		});
	},
});

Deno.test({
	name: "recursion depths",
	fn() {
		runWithDom(() => {
			const tv = new TreeView();
			const child1 = tv.addChild();
			const child2 = child1.addChild();
			child2.renderContainer = true;
			const child3 = child2.addChild();
			child3.renderContainer = true;
			const child4 = child3.addChild();
			const child5 = child4.addChild();

			assertEquals(tv.recursionDepth, 0);
			assertEquals(child1.recursionDepth, 1);
			assertEquals(child2.recursionDepth, 2);
			assertEquals(child3.recursionDepth, 3);
			assertEquals(child4.recursionDepth, 4);
			assertEquals(child5.recursionDepth, 5);

			assertEquals(tv.containerRecursionDepth, 0);
			assertEquals(child1.containerRecursionDepth, 0);
			assertEquals(child2.containerRecursionDepth, 1);
			assertEquals(child3.containerRecursionDepth, 2);
			assertEquals(child4.containerRecursionDepth, 2);
			assertEquals(child5.containerRecursionDepth, 2);
		});
	},
});

Deno.test({
	name: "root as a container recursion depth",
	fn() {
		runWithDom(() => {
			const tv = new TreeView();
			tv.renderContainer = true;
			const child1 = tv.addChild();
			child1.renderContainer = true;
			const child2 = child1.addChild();
			const child3 = child2.addChild();
			child3.renderContainer = true;
			const child4 = child3.addChild();

			assertEquals(tv.containerRecursionDepth, 1);
			assertEquals(child1.containerRecursionDepth, 2);
			assertEquals(child2.containerRecursionDepth, 2);
			assertEquals(child3.containerRecursionDepth, 3);
			assertEquals(child4.containerRecursionDepth, 3);
		});
	},
});

Deno.test({
	name: "background colors",
	fn() {
		runWithDom(() => {
			const treeViews = [];
			let parent = new TreeView();
			treeViews.push(parent);
			for (let i = 0; i < 6; i++) {
				parent = parent.addChild();
				parent.renderContainer = true;
				treeViews.push(parent);
			}

			const bgColors = treeViews.map(tv => tv.el.style.getPropertyValue("background-color"));
			assertEquals(bgColors, [
				"var(--bg-color-level0)",
				"var(--bg-color-level1)",
				"var(--bg-color-level2)",
				"var(--bg-color-level1)",
				"var(--bg-color-level0)",
				"var(--bg-color-level1)",
				"var(--bg-color-level2)",
			]);
			const textColors = treeViews.map(tv => tv.el.style.getPropertyValue("color"));
			assertEquals(textColors, [
				"var(--text-color-level0)",
				"var(--text-color-level1)",
				"var(--text-color-level2)",
				"var(--text-color-level1)",
				"var(--text-color-level0)",
				"var(--text-color-level1)",
				"var(--text-color-level2)",
			]);
		});
	},
});
