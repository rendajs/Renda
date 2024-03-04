import { assertEquals, assertStrictEquals, assertThrows } from "std/testing/asserts.ts";
import { ComponentTypeManager, Entity } from "../../../../../src/mod.js";
import { ExtendedComponent, ExtendedComponent2 } from "./shared.js";

Deno.test({
	name: "adding a component instance",
	fn() {
		const entity = new Entity();
		const component = new ExtendedComponent();
		const returnedComponent = entity.addComponent(component);
		assertEquals(entity.components.length, 1);
		assertStrictEquals(returnedComponent, component);
		assertStrictEquals(entity.components[0], component);
		assertStrictEquals(component.entity, entity);
	},
});

Deno.test({
	name: "adding a component constructor",
	fn() {
		const entity = new Entity();
		const component = entity.addComponent(ExtendedComponent, {
			foo: "bar",
		});
		assertEquals(entity.components.length, 1);
		assertStrictEquals(entity.components[0], component);
		assertStrictEquals(component.entity, entity);
		assertEquals(component.restArgs, [{ foo: "bar" }]);
	},
});

class MockComponentTypeManager extends ComponentTypeManager {
	/**
	 * @param {import("../../../../../src/mod.js").UuidString} uuid
	 */
	getComponentConstructorForUuid(uuid) {
		if (uuid == "existingUuid") {
			return ExtendedComponent;
		} else {
			return null;
		}
	}
}

const mockComponentTypeManager = new MockComponentTypeManager();

Deno.test({
	name: "adding a component uuid",
	fn() {
		const entity = new Entity();
		const component = entity.addComponent(mockComponentTypeManager, "existingUuid");
		assertEquals(entity.components.length, 1);
		assertStrictEquals(entity.components[0], component);
		assertStrictEquals(component.entity, entity);
	},
});

Deno.test({
	name: "adding a component uuid that doesn't exist throws an error",
	fn() {
		const entity = new Entity();
		assertThrows(() => {
			entity.addComponent(mockComponentTypeManager, "nonExistingUuid");
		});
	},
});

Deno.test({
	name: "add component that is already attached",
	fn() {
		const entity = new Entity();
		const component = new ExtendedComponent();
		entity.addComponent(component);
		const returnedComponent = entity.addComponent(component);
		assertEquals(entity.components.length, 1);
		assertStrictEquals(entity.components[0], component);
		assertStrictEquals(returnedComponent, component);
		assertStrictEquals(component.entity, entity);
	},
});

Deno.test({
	name: "add component that is already attached to a different entity should detach it",
	fn() {
		const oldEntity = new Entity();
		const entity = new Entity();
		const component = new ExtendedComponent();
		oldEntity.addComponent(component);
		const returnedComponent = entity.addComponent(component);
		assertEquals(oldEntity.components.length, 0);
		assertEquals(entity.components.length, 1);
		assertStrictEquals(entity.components[0], component);
		assertStrictEquals(returnedComponent, component);
		assertStrictEquals(component.entity, entity);
	},
});

Deno.test({
	name: "removeComponent",
	fn() {
		const entity = new Entity();
		const component = entity.addComponent(ExtendedComponent);
		entity.removeComponent(component);
		assertEquals(entity.components.length, 0);
		assertEquals(component.entity, null);
	},
});

Deno.test({
	name: "remove component that is already removed",
	fn() {
		const entity = new Entity();
		const component = entity.addComponent(ExtendedComponent);
		entity.removeComponent(component);
		entity.removeComponent(component);
		assertEquals(entity.components.length, 0);
		assertEquals(component.entity, null);
	},
});

Deno.test({
	name: "getComponent",
	fn() {
		const entity = new Entity();
		const component = entity.addComponent(ExtendedComponent);
		const component2 = entity.getComponent(ExtendedComponent);
		assertStrictEquals(component, component2);
	},
});

Deno.test({
	name: "getComponent that doesn't exist",
	fn() {
		const entity = new Entity();
		assertEquals(entity.getComponent(ExtendedComponent), null);
	},
});

Deno.test({
	name: "getComponents",
	fn() {
		const entity = new Entity();
		const component = entity.addComponent(ExtendedComponent);
		const components = Array.from(entity.getComponents(ExtendedComponent));
		assertEquals(components.length, 1);
		assertStrictEquals(components[0], component);
	},
});

Deno.test({
	name: "getComponents that doesn't exist",
	fn() {
		const entity = new Entity();
		const components = Array.from(entity.getComponents(ExtendedComponent));
		assertEquals(components.length, 0);
	},
});

Deno.test({
	name: "getComponents from a different constructor",
	fn() {
		const entity = new Entity();
		entity.addComponent(ExtendedComponent);
		const components = Array.from(entity.getComponents(ExtendedComponent2));
		assertEquals(components.length, 0);
	},
});

Deno.test({
	name: "getChildComponents",
	fn() {
		const entity = new Entity();
		const child = new Entity();
		entity.add(child);
		const component = child.addComponent(ExtendedComponent);
		const components = Array.from(entity.getChildComponents(ExtendedComponent));
		assertEquals(components.length, 1);
		assertStrictEquals(components[0], component);
	},
});

Deno.test({
	name: "getChildComponents that doesn't exist",
	fn() {
		const entity = new Entity();
		const child = new Entity();
		entity.add(child);
		const components = Array.from(entity.getChildComponents(ExtendedComponent));
		assertEquals(components.length, 0);
	},
});

Deno.test({
	name: "getChildComponents without children",
	fn() {
		const entity = new Entity();
		const components = Array.from(entity.getChildComponents(ExtendedComponent));
		assertEquals(components.length, 0);
	},
});

Deno.test({
	name: "getChildComponents from a different constructor",
	fn() {
		const entity = new Entity();
		const child = new Entity();
		entity.add(child);
		child.addComponent(ExtendedComponent);
		const components = Array.from(entity.getChildComponents(ExtendedComponent2));
		assertEquals(components.length, 0);
	},
});
