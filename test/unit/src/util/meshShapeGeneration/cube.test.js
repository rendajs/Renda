import { assertEquals, assertStrictEquals } from "std/testing/asserts.ts";
import { Mesh, VertexState, createCube } from "../../../../../src/mod.js";

Deno.test({
	name: "Basic cube",
	fn() {
		const mesh = createCube();

		const vertexData = Array.from(mesh.getVertexData(Mesh.AttributeType.POSITION));
		assertEquals(vertexData.length, 24);
	},
});

Deno.test({
	name: "Sets vertexstate",
	fn() {
		const vertexState = new VertexState();
		const mesh = createCube({
			vertexState,
		});
		assertStrictEquals(mesh.vertexState, vertexState);
	},
});
