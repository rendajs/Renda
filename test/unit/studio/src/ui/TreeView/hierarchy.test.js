import { assertEquals, assertStrictEquals } from "std/testing/asserts.ts";
import "../../../shared/initializeStudio.js";
import { TreeView } from "../../../../../../studio/src/ui/TreeView.js";
import { runWithDom } from "../../../shared/runWithDom.js";
import { createBasicStructure } from "./shared.js";

Deno.test({
	name: "removeChild()",
	fn() {
		runWithDom(() => {
			const treeView = new TreeView();
			const child1 = new TreeView({ name: "child1" });
			treeView.addChild(child1);
			const child2 = new TreeView({ name: "child2" });
			treeView.addChild(child2);
			const child3 = new TreeView({ name: "child3" });
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
			const tv1 = new TreeView();
			const tv2 = tv1.addChild();
			const tv3 = tv2.addChild();
			tv3.renderContainer = true;
			const tv4 = tv3.addChild();
			tv4.renderContainer = true;
			const tv5 = tv4.addChild();
			const tv6 = tv5.addChild();

			const treeViews = [tv1, tv2, tv3, tv4, tv5, tv6];
			const renderContainerValues = treeViews.map(tv => tv.renderContainer);
			const renderContainerClasses = treeViews.map(tv => tv.el.classList.contains("render-container"));
			const expectedRenderContainerValues = [false, false, true, true, false, false];
			assertEquals(renderContainerValues, expectedRenderContainerValues);
			assertEquals(renderContainerClasses, expectedRenderContainerValues);

			const recursionDepths = treeViews.map(tv => tv.recursionDepth);
			assertEquals(recursionDepths, [0, 1, 0, 0, 1, 2]);

			const containerRecursionDepths = treeViews.map(tv => tv.containerRecursionDepth);
			assertEquals(containerRecursionDepths, [0, 0, 1, 2, 2, 2]);

			const child6 = new TreeView();
			const child7 = child6.addChild();
			const child8 = child7.addChild();
			child8.renderContainer = true;

			tv6.addChild(child6);

			assertEquals(child6.recursionDepth, 3);
			assertEquals(child7.recursionDepth, 4);
			assertEquals(child8.recursionDepth, 0);

			assertEquals(child6.containerRecursionDepth, 2);
			assertEquals(child7.containerRecursionDepth, 2);
			assertEquals(child8.containerRecursionDepth, 3);
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
				"",
				"var(--bg-color-level1)",
				"var(--bg-color-level2)",
				"var(--bg-color-level1)",
				"var(--bg-color-level2)",
				"var(--bg-color-level1)",
				"var(--bg-color-level2)",
			]);
			const textColors = treeViews.map(tv => tv.el.style.getPropertyValue("color"));
			assertEquals(textColors, [
				"",
				"var(--text-color-level1)",
				"var(--text-color-level2)",
				"var(--text-color-level1)",
				"var(--text-color-level2)",
				"var(--text-color-level1)",
				"var(--text-color-level2)",
			]);
		});
	},
});

Deno.test({
	name: "forceContainerRecursionDepth()",
	fn() {
		runWithDom(() => {
			const tv1 = new TreeView();
			tv1.renderContainer = true;

			const tv2 = tv1.addChild();
			const tv3 = tv2.addChild();
			tv3.renderContainer = true;
			const tv4 = tv3.addChild();

			tv1.forceContainerRecursionDepth(4);

			const treeViews = [tv1, tv2, tv3, tv4];
			const depths = treeViews.map(tv => tv.recursionDepth);
			assertEquals(depths, [0, 1, 0, 1]);
			const containerDepths = treeViews.map(tv => tv.containerRecursionDepth);
			assertEquals(containerDepths, [4, 4, 5, 5]);
		});
	},
});

Deno.test({
	name: "rowVisible = false skips indentation",
	fn() {
		runWithDom(() => {
			const tv1 = new TreeView();
			const tv2 = tv1.addChild();
			const tv3 = tv2.addChild();
			const tv4 = tv3.addChild();
			const tv5 = tv4.addChild();
			const treeViews = [tv1, tv2, tv3, tv4, tv5];
			tv3.rowVisible = false;

			const depths = treeViews.map(tv => tv.recursionDepth);
			assertEquals(depths, [0, 1, 1, 2, 3]);
		});
	},
});

Deno.test({
	name: "getIndicesPath",
	fn() {
		runWithDom(() => {
			const { root, child2, child3 } = createBasicStructure();

			const result1 = child3.getIndicesPath();
			assertEquals(result1, [0, 0, 2]);
			const result2 = child2.getIndicesPath();
			assertEquals(result2, [0, 0]);
			const result3 = root.getIndicesPath();
			assertEquals(result3, []);
		});
	},
});

Deno.test({
	name: "getNamesPath",
	fn() {
		runWithDom(() => {
			const { root, child2, child3 } = createBasicStructure();

			const result1 = child3.getNamesPath();
			assertEquals(result1, ["root", "child1", "child2", "child3"]);
			const result2 = child2.getNamesPath();
			assertEquals(result2, ["root", "child1", "child2"]);
			const result3 = root.getNamesPath();
			assertEquals(result3, ["root"]);
		});
	},
});

Deno.test({
	name: "getTreeViewsPath",
	fn() {
		runWithDom(() => {
			const { root, child1, child2, child3 } = createBasicStructure();

			const result1 = child3.getTreeViewsPath();
			assertEquals(result1.length, 4);
			assertStrictEquals(result1[0], root);
			assertStrictEquals(result1[1], child1);
			assertStrictEquals(result1[2], child2);
			assertStrictEquals(result1[3], child3);

			const result2 = child2.getTreeViewsPath();
			assertEquals(result2.length, 3);
			assertStrictEquals(result2[0], root);
			assertStrictEquals(result2[1], child1);
			assertStrictEquals(result2[2], child2);

			const result3 = root.getTreeViewsPath();
			assertEquals(result3.length, 1);
			assertStrictEquals(result3[0], root);
		});
	},
});

Deno.test({
	name: "findChildFromNamesPath",
	fn() {
		runWithDom(() => {
			const { root, child2, child3 } = createBasicStructure();

			const result1 = root.findChildFromNamesPath(["child1", "child2", "child3"]);
			assertStrictEquals(result1, child3);

			const result2 = root.findChildFromNamesPath(["child1", "child2"]);
			assertStrictEquals(result2, child2);

			const result3 = root.findChildFromNamesPath([]);
			assertStrictEquals(result3, root);

			const result4 = root.findChildFromNamesPath(["child1", "nonexistent"]);
			assertEquals(result4, null);
		});
	},
});

Deno.test({
	name: "findChildFromIndicesPath",
	fn() {
		runWithDom(() => {
			const { root, child2, child3 } = createBasicStructure();

			const result1 = root.findChildFromIndicesPath([0, 0, 2]);
			assertStrictEquals(result1, child3);

			const result2 = root.findChildFromIndicesPath([0, 0]);
			assertStrictEquals(result2, child2);

			const result3 = root.findChildFromIndicesPath([]);
			assertStrictEquals(result3, root);

			const result4 = root.findChildFromIndicesPath([0, 100]);
			assertEquals(result4, null);
		});
	},
});
