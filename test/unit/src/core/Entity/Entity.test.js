import {assertEquals} from "std/testing/asserts";
import {Entity} from "../../../../../src/mod.js";
import {EXTENDED_COMPONENT_UUID, ExtendedComponent} from "./shared.js";

Deno.test({
	name: "Default name is 'Entity'",
	fn() {
		const entity = new Entity();
		assertEquals(entity.name, "Entity");
	},
});

Deno.test({
	name: "Setting name via constructor options",
	fn() {
		const entity = new Entity({name: "foo"});
		assertEquals(entity.name, "foo");
	},
});

Deno.test({
	name: "Setting name as single constructor argument",
	fn() {
		const entity = new Entity("foo");
		assertEquals(entity.name, "foo");
	},
});

Deno.test({
	name: "toJson() empty entity",
	fn() {
		const entity = new Entity();
		assertEquals(entity.toJson(), {
			name: "Entity",
		});
	},
});

Deno.test({
	name: "toJson() with no name",
	fn() {
		const entity = new Entity("");
		assertEquals(entity.toJson(), {});
	},
});

Deno.test({
	name: "toJson() with a child",
	fn() {
		const entity = new Entity();
		entity.add(new Entity("child"));
		assertEquals(entity.toJson(), {
			name: "Entity",
			children: [
				{
					name: "child",
				},
			],
		});
	},
});

Deno.test({
	name: "toJson() with a non default local matrix",
	fn() {
		const entity = new Entity();
		entity.pos.set(1, 2, 3);
		assertEquals(entity.toJson(), {
			name: "Entity",
			matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 2, 3, 1],
		});
	},
});

Deno.test({
	name: "toJson() with components",
	fn() {
		const entity = new Entity();
		entity.addComponent(new ExtendedComponent());
		entity.addComponent(new ExtendedComponent());
		assertEquals(entity.toJson(), {
			name: "Entity",
			components: [
				{
					uuid: EXTENDED_COMPONENT_UUID,
					propertyValues: {foo: "bar"},
				},
				{
					uuid: EXTENDED_COMPONENT_UUID,
					propertyValues: {foo: "bar"},
				},
			],
		});
	},
});
