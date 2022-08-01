import {assertEquals, assertInstanceOf, assertNotStrictEquals} from "std/testing/asserts.ts";
import {Entity, LightComponent} from "../../../../../src/mod.js";

Deno.test({
	name: "Entity with some children",
	fn() {
		const entity = new Entity("foo");
		const child1 = new Entity("child1");
		entity.add(child1);
		const child2 = new Entity("child2");
		entity.add(child2);
		const subChild = new Entity("subChild");
		child2.add(subChild);

		const result = entity.clone();

		assertNotStrictEquals(entity, result);
		assertEquals(result.name, entity.name);
		assertEquals(result.children.length, entity.children.length);

		assertNotStrictEquals(result.children[0], entity.children[0]);
		assertEquals(result.children[0].name, entity.children[0].name);

		assertNotStrictEquals(result.children[1], entity.children[1]);
		assertEquals(result.children[1].name, entity.children[1].name);

		assertNotStrictEquals(result.children[1].children[0], entity.children[1].children[0]);
		assertEquals(result.children[1].children[0].name, entity.children[1].children[0].name);
	},
});

Deno.test({
	name: "Entity with components",
	fn() {
		const entity = new Entity();
		const component = new LightComponent({
			color: [1, 0, 0],
			lightType: "point",
		});
		entity.addComponent(component);

		const result = entity.clone();

		assertEquals(result.components.length, entity.components.length);
		assertNotStrictEquals(result.components[0], component);
		assertInstanceOf(result.components[0], LightComponent);
		assertEquals(result.components[0].color, component.color);
	},
});
