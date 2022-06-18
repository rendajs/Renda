import {assertEquals, assertStrictEquals} from "std/testing/asserts";
import {Mesh} from "../../../../../src/mod.js";
import {getBasicExtendedComponent} from "./shared.js";

Deno.test({
	name: "Component without any constructor properties",
	fn() {
		const ExtendedComponent = getBasicExtendedComponent();
		const component = new ExtendedComponent();
		assertEquals(component.foo, 3);
		assertEquals(component.bar, null);
	},
});

Deno.test({
	name: "Component with constructor properties",
	fn() {
		const ExtendedComponent = getBasicExtendedComponent();
		const mesh = new Mesh();
		const component = new ExtendedComponent({
			foo: 4,
			bar: mesh,
		});
		assertEquals(component.foo, 4);
		assertStrictEquals(component.bar, mesh);
	},
});
