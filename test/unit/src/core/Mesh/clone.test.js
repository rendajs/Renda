import {assertEquals, assertNotStrictEquals, assertStrictEquals, assertThrows} from "std/testing/asserts.ts";
import {Mesh, Vec3, VertexState} from "../../../../../src/mod.js";
import {FakeVertexState} from "./shared.js";

Deno.test({
	name: "maintains the same vertexState instance",
	fn() {
		const mesh = new Mesh();
		const vertexState = /** @type {VertexState} */ (new FakeVertexState([]));
		mesh.setVertexState(vertexState);

		const clone = mesh.clone();
		assertStrictEquals(clone.vertexState, vertexState);
	},
});
