import {assertEquals, assertStrictEquals} from "std/testing/asserts.ts";
import {Entity} from "../../../../../src/mod.js";
import {createBasicStructure} from "./shared.js";

Deno.test({
	name: "Has no parent by default",
	fn() {
		const entity = new Entity();
		assertEquals(entity.parent, null);
	},
});

Deno.test({
	name: "setting parent via constructor options",
	fn() {
		const parent = new Entity();
		const entity = new Entity({parent});
		assertStrictEquals(entity.parent, parent);
		assertEquals(parent.children.length, 1);
		assertStrictEquals(parent.children[0], entity);
	},
});

Deno.test({
	name: "get and set parent",
	fn() {
		const entity = new Entity();
		const parent = new Entity();
		entity.parent = parent;
		assertStrictEquals(entity.parent, parent);
		assertEquals(parent.children.length, 1);
		assertStrictEquals(parent.children[0], entity);
	},
});

Deno.test({
	name: "set parent that is already set",
	fn() {
		const entity = new Entity();
		const parent = new Entity();
		entity.parent = parent;
		entity.parent = parent;
		assertStrictEquals(entity.parent, parent);
		assertEquals(parent.children.length, 1);
		assertStrictEquals(parent.children[0], entity);
	},
});

Deno.test({
	name: "set parent to a new parent",
	fn() {
		const entity = new Entity();
		const oldParent = new Entity();
		const newParent = new Entity();
		entity.parent = oldParent;
		entity.parent = newParent;
		assertStrictEquals(entity.parent, newParent);
		assertEquals(oldParent.children.length, 0);
		assertEquals(newParent.children.length, 1);
		assertStrictEquals(newParent.children[0], entity);
	},
});

Deno.test({
	name: "set parent to null",
	fn() {
		const entity = new Entity();
		const parent = new Entity();
		entity.parent = parent;
		entity.parent = null;
		assertEquals(parent.children.length, 0);
		assertEquals(entity.parent, null);
	},
});

Deno.test({
	name: "isRoot",
	fn() {
		const entity = new Entity();
		assertEquals(entity.isRoot, true);
		const child = new Entity();
		entity.add(child);
		assertEquals(child.isRoot, false);
	},
});

Deno.test({
	name: "add a child",
	fn() {
		const parent = new Entity();
		const child = new Entity();

		const added = parent.add(child);

		assertEquals(parent.children.length, 1);
		assertStrictEquals(parent.children[0], child);
		assertStrictEquals(child.parent, parent);
		assertStrictEquals(added, child);
	},
});

Deno.test({
	name: "adding as a child removes the existing parent",
	fn() {
		const oldParent = new Entity();
		const newParent = new Entity();
		const child = new Entity();
		oldParent.add(child);
		newParent.add(child);
		assertEquals(oldParent.childCount, 0);
		assertEquals(oldParent.children.length, 0);
		assertEquals(newParent.childCount, 1);
		assertEquals(newParent.children.length, 1);
		assertStrictEquals(newParent.children[0], child);
		assertStrictEquals(child.parent, newParent);
	},
});

Deno.test({
	name: "addAtIndex",
	fn() {
		const child1 = new Entity();
		const child2 = new Entity();
		const child3 = new Entity();
		const parent = new Entity();
		parent.add(child1);
		parent.add(child2);

		const added = parent.addAtIndex(child3, 1);

		assertEquals(parent.children.length, 3);
		assertStrictEquals(parent.children[0], child1);
		assertStrictEquals(parent.children[1], child3);
		assertStrictEquals(parent.children[2], child2);
		assertStrictEquals(added, child3);
		assertStrictEquals(child1.parent, parent);
		assertStrictEquals(child2.parent, parent);
		assertStrictEquals(child3.parent, parent);
	},
});

Deno.test({
	name: "remove child",
	fn() {
		const child1 = new Entity();
		const child2 = new Entity();
		const child3 = new Entity();
		const parent = new Entity();
		parent.add(child1);
		parent.add(child2);
		parent.add(child3);

		parent.remove(child2);

		assertEquals(parent.children.length, 2);
		assertStrictEquals(parent.children[0], child1);
		assertStrictEquals(parent.children[1], child3);
		assertStrictEquals(child1.parent, parent);
		assertStrictEquals(child3.parent, parent);
		assertEquals(child2.parent, null);
	},
});

Deno.test({
	name: "removeAtIndex",
	fn() {
		const child1 = new Entity();
		const child2 = new Entity();
		const child3 = new Entity();
		const parent = new Entity();
		parent.add(child1);
		parent.add(child2);
		parent.add(child3);

		parent.removeAtIndex(1);

		assertEquals(parent.children.length, 2);
		assertStrictEquals(parent.children[0], child1);
		assertStrictEquals(parent.children[1], child3);
		assertStrictEquals(child1.parent, parent);
		assertStrictEquals(child3.parent, parent);
		assertEquals(child2.parent, null);
	},
});

Deno.test({
	name: "detachParent",
	fn() {
		const child = new Entity();
		const parent = new Entity();
		parent.add(child);

		child.detachParent();

		assertEquals(child.parent, null);
		assertEquals(parent.children.length, 0);
	},
});

Deno.test({
	name: "getChildren()",
	fn() {
		const parent = new Entity();
		const child1 = parent.add(new Entity());
		const child2 = parent.add(new Entity());
		const child3 = parent.add(new Entity());

		const children = Array.from(parent.getChildren());

		assertEquals(children.length, 3);
		assertStrictEquals(children[0], child1);
		assertStrictEquals(children[1], child2);
		assertStrictEquals(children[2], child3);
	},
});

Deno.test({
	name: "childCount",
	fn() {
		const parent = new Entity();
		parent.add(new Entity());
		parent.add(new Entity());
		parent.add(new Entity());

		assertEquals(parent.childCount, 3);
	},
});

Deno.test({
	name: "modifying children array doesn't work",
	fn() {
		const child1 = new Entity();
		const child2 = new Entity();
		const parent = new Entity();
		parent.add(child1);

		parent.children.push(child2);

		assertEquals(parent.children.length, 1);
		assertStrictEquals(parent.children[0], child1);
	},
});

Deno.test({
	name: "getRoot()",
	fn() {
		const entity1 = new Entity();
		const entity2 = entity1.add(new Entity());
		const entity3 = entity2.add(new Entity());

		const root = entity3.getRoot();

		assertStrictEquals(root, entity1);
	},
});

function getBasicEntityStructure() {
	const root = new Entity();

	const entity1 = root.add(new Entity());
	const entity1A = entity1.add(new Entity());
	const entity1B = entity1.add(new Entity());

	const entity2 = root.add(new Entity());

	const entity3 = root.add(new Entity());
	const entity3A = entity3.add(new Entity());
	const entity3B = entity3.add(new Entity());
	const entity3C = entity3.add(new Entity());

	return {
		root,
		entity1,
		entity1A,
		entity1B,
		entity2,
		entity3,
		entity3A,
		entity3B,
		entity3C,
	};
}

Deno.test({
	name: "traverseDown()",
	fn() {
		const {
			root,
			entity1, entity1A, entity1B,
			entity2,
			entity3, entity3A, entity3B, entity3C,
		} = getBasicEntityStructure();

		const entities = Array.from(root.traverseDown());

		const expected = [
			root,
			entity1,
			entity1A,
			entity1B,
			entity2,
			entity3,
			entity3A,
			entity3B,
			entity3C,
		];
		assertEquals(entities.length, expected.length);
		for (let i = 0; i < entities.length; i++) {
			assertStrictEquals(entities[i], expected[i]);
		}
	},
});

Deno.test({
	name: "traverseDown() with filter",
	fn() {
		const {
			root,
			entity1,
			entity2,
			entity3, entity3A, entity3B, entity3C,
		} = getBasicEntityStructure();

		const result = Array.from(root.traverseDown({
			filter: e => e !== entity1,
		}));

		const expected = [
			root,
			entity2,
			entity3,
			entity3A,
			entity3B,
			entity3C,
		];
		assertEquals(result.length, expected.length);
		for (let i = 0; i < result.length; i++) {
			assertStrictEquals(result[i], expected[i]);
		}
	},
});

Deno.test({
	name: "traverseUp()",
	fn() {
		const {
			root,
			entity1,
			entity1A,
		} = getBasicEntityStructure();

		const result = Array.from(entity1A.traverseUp());

		assertEquals(result.length, 3);
		assertStrictEquals(result[0], entity1A);
		assertStrictEquals(result[1], entity1);
		assertStrictEquals(result[2], root);
	},
});

Deno.test({
	name: "traverseUp() with filter",
	fn() {
		const {
			entity1,
			entity1A,
		} = getBasicEntityStructure();

		const result = Array.from(entity1A.traverseUp({
			filter: e => e !== entity1,
		}));

		assertEquals(result.length, 1);
		assertStrictEquals(result[0], entity1A);
	},
});

Deno.test({
	name: "containsChild() and containsParent()",
	fn() {
		const entity1 = new Entity("entity1");
		const entity2 = entity1.add(new Entity("entity2"));
		const entity3 = entity2.add(new Entity("entity3"));
		const entity4 = entity3.add(new Entity("entity4"));
		const nonChild = new Entity("nonChild");

		/** @type {[Entity, Entity, boolean][]} */
		const tests = [
			[entity2, entity3, true],
			[entity2, entity4, true],
			[entity1, entity2, true],
			[entity2, nonChild, false],
			[entity3, entity1, false],
			[entity2, entity2, false],
		];
		for (const [parent, child, expected] of tests) {
			const result1 = parent.containsChild(child);
			assertEquals(result1, expected, `Expected ${parent.name}.containsChild(${child.name}) to return ${expected}`);

			const result2 = child.containsParent(parent);
			assertEquals(result2, expected, `Expected ${child.name}.containsChild(${parent.name}) to return ${expected}`);
		}
	},
});

Deno.test({
	name: "getEntityByIndicesPath()",
	fn() {
		const {root, child3} = createBasicStructure();

		const entity = root.getEntityByIndicesPath([0, 0, 2]);

		assertStrictEquals(entity, child3);
	},
});

Deno.test({
	name: "getEntityByIndicesPath() invalid indices",
	fn() {
		const {root} = createBasicStructure();

		const paths = [
			[0, 100],
			[0, -1],
			[-1],
			[0, 0, 2, 100],
		];

		for (const path of paths) {
			const result = root.getEntityByIndicesPath(path);

			assertEquals(result, null);
		}
	},
});

Deno.test({
	name: "getEntityByName()",
	fn() {
		const {root, child1, child2, child3} = createBasicStructure();

		const rootResult = root.getEntityByName("root");
		assertStrictEquals(rootResult, root);

		const child1Result = root.getEntityByName("child1");
		assertStrictEquals(child1Result, child1);

		const child2Result = root.getEntityByName("child2");
		assertStrictEquals(child2Result, child2);

		const child3Result = root.getEntityByName("child3");
		assertStrictEquals(child3Result, child3);

		const nonExistentResult = root.getEntityByName("non-existent");
		assertEquals(nonExistentResult, null);
	},
});
