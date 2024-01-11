import {assertEquals, assertStrictEquals} from "std/testing/asserts.ts";
import {VertexState, createCube} from "../../../../../src/mod.js";

Deno.test({
	name: "Basic cube",
	fn() {
		const mesh = createCube();

		const positionBuffer = mesh.getBufferForAttributeType(0);
		const vertexData = Array.from(positionBuffer.getVertexData(0));
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
