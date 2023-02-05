import "../shared/initializeEditor.js";
import {TreeView} from "../../../../editor/src/ui/TreeView.js";
import {runWithDom} from "../shared/runWithDom.js";
import {assertTreeViewStructureEquals, getChildTreeViewFromIndices} from "./treeViewUtil.js";
import {assertStrictEquals, assertThrows} from "std/testing/asserts.ts";
import {PropertiesTreeView} from "../../../../editor/src/ui/propertiesTreeView/PropertiesTreeView.js";

Deno.test({
	name: "basic structure equals",
	fn() {
		runWithDom(() => {
			const tv = new TreeView({name: "root"});

			const child1 = tv.addChild();
			child1.name = "child1";

			const child2 = child1.addChild();
			child2.name = "child2";

			const child3 = tv.addChild();
			child3.name = "child3";

			assertTreeViewStructureEquals(tv, {
				name: "root",
				children: [
					{
						name: "child1",
						children: [
							{
								name: "child2",
							},
						],
					},
					{
						name: "child3",
						children: [],
					},
				],
			});
		});
	},
});

Deno.test({
	name: "basic structure not equals",
	fn() {
		runWithDom(() => {
			const tv = new TreeView({name: "root"});
			const child1 = tv.addChild();
			child1.addChild();
			tv.addChild();

			assertThrows(() => {
				assertTreeViewStructureEquals(tv, {
					name: "root",
					children: [
						{},
						{
							children: [{}],
						},
					],
				});
			});
		});
	},
});

Deno.test({
	name: "isPropertiesTreeViewEntry",
	fn() {
		runWithDom(() => {
			const tv1 = new PropertiesTreeView();
			tv1.addItem({
				type: "string",
				guiOpts: {
					label: "label",
				},
			});

			assertTreeViewStructureEquals(tv1, {
				children: [
					{
						isPropertiesEntry: true,
						propertiesLabel: "Label",
					},
				],
			});

			assertThrows(() => {
				assertTreeViewStructureEquals(tv1, {
					children: [
						{
							isPropertiesEntry: false,
						},
					],
				});
			});

			assertThrows(() => {
				assertTreeViewStructureEquals(tv1, {
					children: [
						{
							isPropertiesEntry: true,
							propertiesLabel: "different",
						},
					],
				});
			});
		});
	},
});

Deno.test({
	name: "getChildFromIndices()",
	fn() {
		runWithDom(() => {
			const tv = new TreeView();
			const child1 = tv.addChild();
			const child1b = tv.addChild();
			const child2 = child1.addChild();

			const result1 = getChildTreeViewFromIndices(tv);
			assertStrictEquals(result1, tv);
			const result2 = getChildTreeViewFromIndices(tv, 1);
			assertStrictEquals(result2, child1b);
			const result3 = getChildTreeViewFromIndices(tv, 0, 0);
			assertStrictEquals(result3, child2);

			assertThrows(() => {
				getChildTreeViewFromIndices(tv, 2);
			}, Error, "The TreeView at this indices path does not exist.");
			assertThrows(() => {
				getChildTreeViewFromIndices(tv, 0, 1);
			}, Error, "The TreeView at this indices path does not exist.");
			assertThrows(() => {
				getChildTreeViewFromIndices(tv, 0, 0, 0);
			}, Error, "The TreeView at this indices path does not exist.");
		});
	},
});
