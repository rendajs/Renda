import { TreeView } from "../../../../../../studio/src/ui/TreeView.js";

export function createBasicStructure() {
	const root = new TreeView({
		name: "root",
	});

	const child1 = root.addChild();
	child1.name = "child1";

	const child2 = child1.addChild();
	child2.name = "child2";
	child1.addChild();

	child2.addChild();
	child2.addChild();
	const child3 = child2.addChild();
	child3.name = "child3";

	return { root, child1, child2, child3 };
}
