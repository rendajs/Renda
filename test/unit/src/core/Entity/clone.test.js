import { assertEquals, assertInstanceOf, assertNotStrictEquals, assertStrictEquals, assertThrows } from "std/testing/asserts.ts";
import { Entity, LightComponent } from "../../../../../src/mod.js";
import { assertVecAlmostEquals } from "../../../shared/asserts.js";

function createBasicEntity() {
	const entity = new Entity("root");
	const child1 = new Entity("child1");
	entity.add(child1);
	const child2 = new Entity("child2");
	entity.add(child2);
	const subChild = new Entity("subChild");
	child2.add(subChild);
	return { entity, child1, child2, subChild };
}

/**
 * Asserts if two entities have the same hierarchy and with none of the children being strictly equals.
 * Does not check for components.
 *
 * @param {Entity} sourceEntity
 * @param {Entity} resultEntity
 */
function assertExactClone(sourceEntity, resultEntity) {
	assertNotStrictEquals(sourceEntity, resultEntity);
	assertEquals(resultEntity.name, sourceEntity.name);
	assertEquals(resultEntity.children.length, sourceEntity.children.length);

	assertNotStrictEquals(resultEntity.children[0], sourceEntity.children[0]);
	assertEquals(resultEntity.children[0].name, sourceEntity.children[0].name);
	assertEquals(resultEntity.children[0].childCount, sourceEntity.children[0].childCount);

	assertNotStrictEquals(resultEntity.children[1], sourceEntity.children[1]);
	assertEquals(resultEntity.children[1].name, sourceEntity.children[1].name);
	assertEquals(resultEntity.children[1].childCount, sourceEntity.children[1].childCount);

	assertNotStrictEquals(resultEntity.children[1].children[0], sourceEntity.children[1].children[0]);
	assertEquals(resultEntity.children[1].children[0].name, sourceEntity.children[1].children[0].name);
	assertEquals(resultEntity.children[1].children[0].childCount, sourceEntity.children[1].children[0].childCount);
}

Deno.test({
	name: "Entity with some children",
	fn() {
		const { entity } = createBasicEntity();
		const result = entity.clone();
		assertExactClone(entity, result);
	},
});

Deno.test({
	name: "Entity with components",
	fn() {
		const entity = new Entity();
		const component = new LightComponent({
			color: [1, 0, 0],
			type: "point",
		});
		entity.addComponent(component);

		const result = entity.clone();

		assertEquals(result.components.length, entity.components.length);
		assertNotStrictEquals(result.components[0], component);
		assertInstanceOf(result.components[0], LightComponent);
		assertEquals(result.components[0].color, component.color);
	},
});

Deno.test({
	name: "Entity with different matrix",
	fn() {
		const entity = new Entity();
		entity.pos.set(1, 2, 3);

		const clone = entity.clone();
		assertVecAlmostEquals(clone.pos, [1, 2, 3]);
	},
});

Deno.test({
	name: "Clone with cloneChildHook, returning false omits children",
	fn() {
		const { entity } = createBasicEntity();

		const result = entity.clone({
			cloneChildHook({ child }) {
				if (child.name == "child2") {
					return false;
				}
				return null;
			},
		});
		assertNotStrictEquals(result, entity);
		assertEquals(result.name, entity.name);
		assertEquals(result.childCount, 1);
		assertNotStrictEquals(result.children[0], entity.children[0]);
		assertNotStrictEquals(result.children[0], entity.children[1]);
		assertEquals(result.children[0].name, entity.children[0].name);
	},
});

Deno.test({
	name: "Clone with cloneChildHook, returning the child without cloning doesn't clone it",
	fn() {
		const { entity } = createBasicEntity();

		const originalChild2 = entity.children[1];
		const result = entity.clone({
			cloneChildHook({ child }) {
				if (child.name == "child2") {
					return child;
				}
				return null;
			},
		});
		assertNotStrictEquals(result, entity);
		assertEquals(result.name, entity.name);
		assertEquals(result.childCount, 2);
		assertNotStrictEquals(result.children[0], entity.children[0]);
		assertNotStrictEquals(result.children[0], entity.children[1]);
		assertEquals(result.children[0].name, entity.children[0].name);
		assertStrictEquals(result.children[1], originalChild2);
	},
});

Deno.test({
	name: "Clone with cloneChildHook, returning null or undefined clones the child as usual",
	fn() {
		const { entity } = createBasicEntity();

		const result = entity.clone({
			cloneChildHook({ child, options }) {
				if (child.name == "child1") {
					return null;
				} else if (child.name == "child2") {
					return undefined;
				}
			},
		});
		assertExactClone(entity, result);
	},
});

Deno.test({
	name: "cloneChildHook gets called on the root itself",
	fn() {
		const entity1 = new Entity("1");
		entity1.add(new Entity("child1"));
		const entity2 = new Entity("2");
		entity2.add(new Entity("child2"));

		let callCount = 0;
		const result = entity1.clone({
			cloneChildHook({ child }) {
				callCount++;
				if (child === entity1) return entity2;
			},
		});
		assertEquals(callCount, 1);
		assertStrictEquals(result, entity2);
	},
});

Deno.test({
	name: "cloneChildHook returning false for the root throws",
	fn() {
		const entity1 = new Entity("1");
		entity1.add(new Entity("child1"));
		const entity2 = new Entity("2");
		entity2.add(new Entity("child2"));

		assertThrows(() => {
			entity1.clone({
				cloneChildHook({ child }) {
					if (child === entity1) return false;
				},
			});
		}, Error, "cloneChildHook cannot return false for the root entity.");
	},
});
