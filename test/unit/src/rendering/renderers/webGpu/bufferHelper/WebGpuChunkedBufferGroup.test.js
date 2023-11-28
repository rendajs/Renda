import {assertEquals} from "std/testing/asserts.ts";
import {Mat4, Vec2, Vec3, Vec4} from "../../../../../../../src/mod.js";
import {WebGpuChunkedBufferGroup} from "../../../../../../../src/rendering/renderers/webGpu/bufferHelper/WebGpuChunkedBufferGroup.js";

/**
 * @param {WebGpuChunkedBufferGroup} group
 */
function getByteArray(group) {
	return Array.from(new Uint8Array(group.getBuffer()));
}

Deno.test({
	name: "appendScalar()",
	fn() {
		const group = new WebGpuChunkedBufferGroup();
		group.appendScalar(3, "u32");
		assertEquals(group.byteLength, 4);
		assertEquals(group.byteLengthWithPadding, 4);
		assertEquals(getByteArray(group), [3, 0, 0, 0]);
	},
});

Deno.test({
	name: "appendScalar() creates padding",
	fn() {
		const group = new WebGpuChunkedBufferGroup();
		group.appendScalar(4);
		group.appendEmptyBytes(1);
		assertEquals(group.byteLength, 5);
		assertEquals(group.byteLengthWithPadding, 8);
	},
});

Deno.test({
	name: "appendMatrix()",
	fn() {
		const group = new WebGpuChunkedBufferGroup();
		const matrix = new Mat4();
		group.appendMatrix(matrix, "u32");
		assertEquals(group.byteLength, 64);
		assertEquals(group.byteLengthWithPadding, 64);
		/* eslint-disable array-bracket-newline, no-multi-spaces */
		assertEquals(getByteArray(group), [
			1,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			1,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			1,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			1,
			0,
			0,
			0,
		]);
		/* eslint-enable array-bracket-newline, no-multi-spaces */
	},
});

Deno.test({
	name: "appendMatrix() creates padding",
	fn() {
		const group = new WebGpuChunkedBufferGroup();
		group.appendMatrix(new Mat4());
		group.appendEmptyBytes(1);
		assertEquals(group.byteLength, 65);
		assertEquals(group.byteLengthWithPadding, 80);
	},
});

Deno.test({
	name: "append Vec2",
	fn() {
		const group = new WebGpuChunkedBufferGroup();
		group.appendMathType(new Vec2(1, 2), "u32");
		assertEquals(group.byteLength, 8);
		assertEquals(group.byteLengthWithPadding, 8);
		assertEquals(getByteArray(group), [1, 0, 0, 0, 2, 0, 0, 0]);
	},
});

Deno.test({
	name: "appending a Vec2 creates padding",
	fn() {
		const group = new WebGpuChunkedBufferGroup();
		group.appendMathType(new Vec2());
		group.appendEmptyBytes(9);
		assertEquals(group.byteLength, 17);
		assertEquals(group.byteLengthWithPadding, 24);
	},
});

Deno.test({
	name: "append Vec3",
	fn() {
		const group = new WebGpuChunkedBufferGroup();
		group.appendMathType(new Vec3(1, 2, 3), "u32");
		assertEquals(group.byteLength, 12);
		assertEquals(group.byteLengthWithPadding, 16);
		assertEquals(getByteArray(group), [1, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 0]);
	},
});

Deno.test({
	name: "appending a Vec3 creates padding",
	fn() {
		const group = new WebGpuChunkedBufferGroup();
		group.appendMathType(new Vec3());
		group.appendEmptyBytes(5);
		assertEquals(group.byteLength, 17);
		assertEquals(group.byteLengthWithPadding, 32);
	},
});

Deno.test({
	name: "append Vec4",
	fn() {
		const group = new WebGpuChunkedBufferGroup();
		group.appendMathType(new Vec4(1, 2, 3, 4), "u32");
		assertEquals(group.byteLength, 16);
		assertEquals(group.byteLengthWithPadding, 16);
		assertEquals(getByteArray(group), [1, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 0, 4, 0, 0, 0]);
	},
});

Deno.test({
	name: "appending a Vec3 creates padding",
	fn() {
		const group = new WebGpuChunkedBufferGroup();
		group.appendMathType(new Vec4());
		group.appendEmptyBytes(1);
		assertEquals(group.byteLength, 17);
		assertEquals(group.byteLengthWithPadding, 32);
	},
});

Deno.test({
	name: "appendNumericArray()",
	fn() {
		const group = new WebGpuChunkedBufferGroup();
		group.appendNumericArray([1, 2, 3], "u32");
		assertEquals(group.byteLength, 12);
		assertEquals(group.byteLengthWithPadding, 12);
		assertEquals(getByteArray(group), [1, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 0]);
	},
});

Deno.test({
	name: "appendNumericArray() creates padding",
	fn() {
		const group = new WebGpuChunkedBufferGroup();
		group.appendNumericArray([1, 2, 3, 4]);
		group.appendEmptyBytes(1);
		assertEquals(group.byteLength, 17);
		assertEquals(group.byteLengthWithPadding, 20);
	},
});

Deno.test({
	name: "appendBuffer()",
	fn() {
		const group = new WebGpuChunkedBufferGroup();
		group.appendBuffer(new Uint8Array([1, 2, 3]));
		assertEquals(group.byteLength, 3);
		assertEquals(group.byteLengthWithPadding, 3);
		assertEquals(getByteArray(group), [1, 2, 3]);
	},
});

Deno.test({
	name: "appendEmptyBytes()",
	fn() {
		const group = new WebGpuChunkedBufferGroup();
		group.appendEmptyBytes(3);
		assertEquals(group.byteLength, 3);
		assertEquals(group.byteLengthWithPadding, 3);
		assertEquals(getByteArray(group), [0, 0, 0]);
	},
});

Deno.test({
	name: "clearData()",
	fn() {
		const group = new WebGpuChunkedBufferGroup();
		group.appendEmptyBytes(3);
		group.appendScalar(42);
		group.clearData();
		assertEquals(group.byteLength, 0);
		assertEquals(group.byteLengthWithPadding, 0);
		assertEquals(getByteArray(group), []);
	},
});

Deno.test({
	name: "Concatenating multiple data types",
	fn() {
		const group = new WebGpuChunkedBufferGroup();
		group.appendScalar(42);
		group.appendNumericArray([1, 2, 3], "i32");
		group.appendEmptyBytes(2);
		assertEquals(group.byteLength, 18);
		assertEquals(group.byteLengthWithPadding, 20);
		assertEquals(getByteArray(group), [0, 0, 40, 66, 1, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 0, 0, 0]);
	},
});
