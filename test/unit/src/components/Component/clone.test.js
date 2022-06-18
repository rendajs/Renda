import {assertEquals, assertInstanceOf, assertNotStrictEquals, assertStrictEquals} from "std/testing/asserts";
import {getBasicExtendedComponent} from "./shared.js";
import {Mesh} from "../../../../../src/mod.js";

Deno.test({
	name: "Basic property types",
	fn() {
		const ExtendedComponent = getBasicExtendedComponent();
		const mesh = new Mesh();
		const component = new ExtendedComponent({
			foo: 4,
			bar: mesh,
		});

		const result = component.clone();

		assertNotStrictEquals(result, component);
		assertInstanceOf(result, ExtendedComponent);
		assertEquals(result.foo, 4);
		assertStrictEquals(result.bar, mesh);
	},
});
