import { assertEquals, assertStrictEquals } from "std/testing/asserts.ts";
import { Mesh, Vec3 } from "../../../../../src/mod.js";
import { FakeVertexState, mockVertexStateSingleAttribute } from "./shared.js";
import { assertVecAlmostEquals } from "../../../../../src/util/asserts.js";

Deno.test({
	name: "maintains the same vertexState instance",
	fn() {
		const mesh = new Mesh();
		const vertexState = /** @type {import("../../../../../src/mod.js").VertexState} */ (new FakeVertexState([]));
		mesh.setVertexState(vertexState);

		const clone = mesh.clone();
		assertStrictEquals(clone.vertexState, vertexState);
	},
});

Deno.test({
	name: "clones used buffers",
	fn() {
		const mesh = new Mesh();
		mesh.setVertexState(mockVertexStateSingleAttribute);
		mesh.setVertexCount(3);
		mesh.setVertexData(Mesh.AttributeType.POSITION, [new Vec3(1, 2, 3)]);

		const clone = mesh.clone();
		const vertexData1 = Array.from(clone.getVertexData(Mesh.AttributeType.POSITION));
		assertVecAlmostEquals(vertexData1[0], [1, 2, 3]);

		mesh.setVertexData(Mesh.AttributeType.POSITION, [new Vec3(4, 5, 6)]);
		const vertexData2 = Array.from(clone.getVertexData(Mesh.AttributeType.POSITION));
		assertVecAlmostEquals(vertexData2[0], [1, 2, 3]);
	},
});

Deno.test({
	name: "clones unused buffers",
	fn() {
		const mesh = new Mesh();
		mesh.setVertexCount(3);
		mesh.setVertexData(Mesh.AttributeType.POSITION, [new Vec3(1, 2, 3)]);

		const clone = mesh.clone();
		const buffers1 = Array.from(clone.#getBuffers());
		assertEquals(buffers1.length, 1);
		const vertexData1 = Array.from(buffers1[0].getVertexData(Mesh.AttributeType.POSITION));
		assertVecAlmostEquals(vertexData1[0], [1, 2, 3]);

		mesh.setVertexData(Mesh.AttributeType.POSITION, [new Vec3(4, 5, 6)]);
		const buffers2 = Array.from(clone.#getBuffers());
		assertEquals(buffers2.length, 1);
		const vertexData2 = Array.from(buffers2[0].getVertexData(Mesh.AttributeType.POSITION));
		assertVecAlmostEquals(vertexData2[0], [1, 2, 3]);
	},
});

Deno.test({
	name: "clones the index buffer",
	fn() {
		const mesh = new Mesh();
		mesh.setIndexFormat(Mesh.IndexFormat.UINT_32);
		mesh.setIndexData([1, 2, 3]);

		const clone = mesh.clone();
		assertEquals(Array.from(clone.getIndexData()), [1, 2, 3]);
		assertEquals(clone.indexFormat, Mesh.IndexFormat.UINT_32);
		assertEquals(clone.indexCount, 3);

		mesh.setIndexData([4, 5, 6]);
		assertEquals(Array.from(clone.getIndexData()), [1, 2, 3]);
	},
});

Deno.test({
	name: "clones the vertex count",
	fn() {
		const mesh = new Mesh();
		mesh.setVertexCount(3);

		const clone = mesh.clone();
		assertEquals(clone.vertexCount, 3);

		mesh.setVertexCount(4);
		assertEquals(clone.vertexCount, 3);
	},
});
