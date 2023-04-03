import {assertEquals, assertInstanceOf} from "std/testing/asserts.ts";
import {Vec3, createPlane} from "../../../../../src/mod.js";
import {assertVecAlmostEquals} from "../../../shared/asserts.js";

Deno.test({
	name: "Basic plane",
	fn() {
		const mesh = createPlane();

		const positionBuffer = mesh.getBufferForAttributeType(0);
		const vertexData = Array.from(positionBuffer.getVertexData(0));
		assertEquals(vertexData.length, 4);

		const indexData = Array.from(mesh.getIndexData());
		assertEquals(indexData, [0, 1, 2, 1, 3, 2]);
	},
});

Deno.test({
	name: "Custom segments",
	fn() {
		const mesh = createPlane({
			widthSegments: 5,
			heightSegments: 3,
		});

		const positionBuffer = mesh.getBufferForAttributeType(0);
		const vertexData = Array.from(positionBuffer.getVertexData(0));
		assertEquals(vertexData.length, 24);
	},
});

Deno.test({
	name: "Custom segment indices",
	fn() {
		const mesh = createPlane({
			widthSegments: 2,
			heightSegments: 2,
		});

		const positionBuffer = mesh.getBufferForAttributeType(0);
		const vertexData = Array.from(positionBuffer.getVertexData(0));
		assertEquals(vertexData.length, 9);
		const indexData = Array.from(mesh.getIndexData());
		/* eslint-disable array-element-newline */
		assertEquals(indexData.join(","), [
			0, 1, 3, 1, 4, 3,
			1, 2, 4, 2, 5, 4,
			3, 4, 6, 4, 7, 6,
			4, 5, 7, 5, 8, 7,
		].join(","));
		/* eslint-enable array-element-newline */
	},
});

Deno.test({
	name: "Custom size",
	fn() {
		const mesh = createPlane({
			width: 5,
			height: 3,
		});

		const positionBuffer = mesh.getBufferForAttributeType(0);
		const min = new Vec3();
		const max = new Vec3();
		for (const vert of positionBuffer.getVertexData(0)) {
			assertInstanceOf(vert, Vec3);
			min.x = Math.min(min.x, vert.x);
			min.y = Math.min(min.y, vert.y);
			min.z = Math.min(min.z, vert.z);
			max.x = Math.max(max.x, vert.x);
			max.y = Math.max(max.y, vert.y);
			max.z = Math.max(max.z, vert.z);
		}
		assertVecAlmostEquals(min, [-2.5, 0, -1.5]);
		assertVecAlmostEquals(max, [2.5, 0, 1.5]);
	},
});
