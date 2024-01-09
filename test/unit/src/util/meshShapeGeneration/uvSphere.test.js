import {assertEquals, assertStrictEquals} from "std/testing/asserts.ts";
import {VertexState, createUvSphere} from "../../../../../src/mod.js";

Deno.test({
	name: "Basic sphere",
	fn() {
		const mesh = createUvSphere({
			heightSegments: 3,
			widthSegments: 3,
		});

		const positionBuffer = mesh.getBufferForAttributeType(0);
		const vertexData = Array.from(positionBuffer.getVertexData(0));
		assertEquals(vertexData.length, 9);

		const indexData = Array.from(mesh.getIndexData());
		assertEquals(indexData, [0, 4, 1, 1, 4, 2, 2, 4, 5, 3, 7, 4, 4, 7, 5, 5, 7, 8, 6, 1, 7, 7, 1, 8, 8, 1, 2]);
	},
});

Deno.test({
	name: "More segments",
	fn() {
		const mesh = createUvSphere({
			heightSegments: 10,
			widthSegments: 10,
		});

		const positionBuffer = mesh.getBufferForAttributeType(0);
		const vertexData = Array.from(positionBuffer.getVertexData(0));
		assertEquals(vertexData.length, 100);

		const indexData = Array.from(mesh.getIndexData());
		assertEquals(indexData.length, 510);
	},
});

Deno.test({
	name: "Sets vertexstate",
	fn() {
		const vertexState = new VertexState();
		const mesh = createUvSphere({
			vertexState,
		});
		assertStrictEquals(mesh.vertexState, vertexState);
	},
});
