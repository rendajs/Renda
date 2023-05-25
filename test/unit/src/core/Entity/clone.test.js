import {assertEquals, assertInstanceOf, assertNotStrictEquals, assertStrictEquals} from "std/testing/asserts.ts";
import {Entity, LightComponent} from "../../../../../src/mod.js";

function createBasicEntity() {
	const entity = new Entity("root");
	const child1 = new Entity("child1");
	entity.add(child1);
	const child2 = new Entity("child2");
	entity.add(child2);
	const subChild = new Entity("subChild");
	child2.add(subChild);
	return {entity, child1, child2, subChild};
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
		const {entity} = createBasicEntity();
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
	name: "Clone with cloneChildHook, returning false omits children",
	fn() {
		const {entity} = createBasicEntity();

		const result = entity.clone({
			cloneChildHook({child, options}) {
				if (child.name == "child2") {
					return false;
				}
				return child.clone(options);
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
		const {entity} = createBasicEntity();

		const originalChild2 = entity.children[1];
		const result = entity.clone({
			cloneChildHook({child, options}) {
				if (child.name == "child2") {
					return child;
				}
				return child.clone(options);
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
		const {entity} = createBasicEntity();

		const result = entity.clone({
			cloneChildHook({child, options}) {
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
