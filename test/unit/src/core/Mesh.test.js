import {assertEquals, assertNotStrictEquals, assertStrictEquals, assertThrows} from "asserts";
import {Mesh, Vec3} from "../../../../src/mod.js";

Deno.test({
	name: "Mesh should have an index format of UINT16 by default",
	fn() {
		const mesh = new Mesh();

		assertEquals(mesh.indexFormat, Mesh.IndexFormat.UINT_16);
	},
});

Deno.test({
	name: "setIndexFormat() should change the index format",
	fn() {
		const mesh = new Mesh();
		mesh.setIndexData(new Uint16Array([1, 2, 3]));

		mesh.setIndexFormat(Mesh.IndexFormat.UINT_16);
		assertEquals(mesh.indexFormat, Mesh.IndexFormat.UINT_16);

		mesh.setIndexFormat(Mesh.IndexFormat.UINT_32);
		assertEquals(mesh.indexFormat, Mesh.IndexFormat.UINT_32);

		mesh.setIndexFormat(Mesh.IndexFormat.UINT_16);
		assertEquals(mesh.indexFormat, Mesh.IndexFormat.UINT_16);
	},
});

Deno.test({
	name: "setIndexFormat() should keep existing index data",
	fn() {
		const mesh = new Mesh();
		const data = new Uint16Array([1, 2, 3]);
		mesh.setIndexData(data);

		mesh.setIndexFormat(Mesh.IndexFormat.UINT_16);
		assertEquals(Array.from(mesh.getIndexData()), [1, 2, 3]);

		mesh.setIndexFormat(Mesh.IndexFormat.UINT_32);
		assertEquals(Array.from(mesh.getIndexData()), [1, 2, 3]);

		mesh.setIndexFormat(Mesh.IndexFormat.UINT_16);
		assertEquals(Array.from(mesh.getIndexData()), [1, 2, 3]);
	},
});

Deno.test({
	name: "setIndexFormat() should fire onIndexBufferChange",
	fn() {
		const mesh = new Mesh();
		const data = new Uint16Array([1, 2, 3]);
		mesh.setIndexData(data);
		let onIndexBufferChangeCallCount = 0;
		mesh.onIndexBufferChange(() => {
			onIndexBufferChangeCallCount++;
		});

		mesh.setIndexFormat(Mesh.IndexFormat.UINT_16);
		assertEquals(onIndexBufferChangeCallCount, 0);
		onIndexBufferChangeCallCount = 0;

		mesh.setIndexFormat(Mesh.IndexFormat.UINT_32);
		assertEquals(onIndexBufferChangeCallCount, 1);
		onIndexBufferChangeCallCount = 0;

		mesh.setIndexFormat(Mesh.IndexFormat.UINT_32);
		assertEquals(onIndexBufferChangeCallCount, 0);
		onIndexBufferChangeCallCount = 0;

		mesh.setIndexFormat(Mesh.IndexFormat.UINT_16);
		assertEquals(onIndexBufferChangeCallCount, 1);
		onIndexBufferChangeCallCount = 0;
	},
});

Deno.test({
	name: "getDataView() should reuse existing DataView when possible",
	fn() {
		const mesh = new Mesh();

		const dataView1 = mesh.getDataView();
		const dataView2 = mesh.getDataView();

		assertStrictEquals(dataView1, dataView2);
	},
});

Deno.test({
	name: "getDataView() should create a new DataView when the buffer changed",
	fn() {
		const mesh = new Mesh();

		const dataView1 = mesh.getDataView();

		mesh.setIndexData(new ArrayBuffer(0));
		const dataView2 = mesh.getDataView();

		assertNotStrictEquals(dataView1, dataView2);
	},
});

Deno.test({
	name: "setIndexData() with ArrayBuffer for index format UINT_16",
	fn() {
		const mesh = new Mesh();
		mesh.setIndexFormat(Mesh.IndexFormat.UINT_16);
		const typedArray = new Uint16Array([1, 2]);

		mesh.setIndexData(typedArray.buffer);

		const data = Array.from(mesh.getIndexData());
		assertEquals(data, [1, 2]);
	},
});

Deno.test({
	name: "setIndexData() with ArrayBuffer for index format UINT_32",
	fn() {
		const mesh = new Mesh();
		mesh.setIndexFormat(Mesh.IndexFormat.UINT_32);
		const typedArray = new Uint32Array([1, 2]);

		mesh.setIndexData(typedArray.buffer);

		const data = Array.from(mesh.getIndexData());
		assertEquals(data, [1, 2]);
		assertEquals(mesh.indexFormat, Mesh.IndexFormat.UINT_32);
		assertEquals(mesh.indexCount, 2);
	},
});

Deno.test({
	name: "setIndexData() with Uint16Array",
	fn() {
		const mesh = new Mesh();
		const uint16Array = new Uint16Array([1, 2]);

		mesh.setIndexData(uint16Array);

		const data = Array.from(mesh.getIndexData());
		assertEquals(data, [1, 2]);
		assertEquals(mesh.indexFormat, Mesh.IndexFormat.UINT_16);
		assertEquals(mesh.indexCount, 2);
	},
});

Deno.test({
	name: "setIndexData() with Uint32Array",
	fn() {
		const mesh = new Mesh();
		const uint32Array = new Uint32Array([1, 2]);

		mesh.setIndexData(uint32Array);

		const data = Array.from(mesh.getIndexData());
		assertEquals(data, [1, 2]);
		assertEquals(mesh.indexFormat, Mesh.IndexFormat.UINT_32);
		assertEquals(mesh.indexCount, 2);
	},
});

Deno.test({
	name: "setIndexData() with an unsupported TypedArray type should throw",
	fn() {
		const mesh = new Mesh();
		const uint32Array = new Int16Array([1, 2]);

		assertThrows(() => {
			mesh.setIndexData(uint32Array);
		});
	},
});

Deno.test({
	name: "setIndexData() switching between Uint16Array and Uint32Array",
	fn() {
		const mesh = new Mesh();
		const uint16Array = new Uint16Array([1, 2]);
		const uint32Array = new Uint32Array([1, 2]);

		assertEquals(mesh.indexFormat, Mesh.IndexFormat.UINT_16);

		mesh.setIndexData(uint16Array);
		assertEquals(mesh.indexFormat, Mesh.IndexFormat.UINT_16);

		mesh.setIndexData(uint32Array);
		assertEquals(mesh.indexFormat, Mesh.IndexFormat.UINT_32);

		mesh.setIndexData(uint32Array);
		assertEquals(mesh.indexFormat, Mesh.IndexFormat.UINT_32);

		mesh.setIndexData(uint16Array);
		assertEquals(mesh.indexFormat, Mesh.IndexFormat.UINT_16);
	},
});

Deno.test({
	name: "setIndexData() with an array of numbers for index format UINT_16",
	fn() {
		const mesh = new Mesh();
		mesh.setIndexFormat(Mesh.IndexFormat.UINT_16);

		mesh.setIndexData([1, 2]);

		const data = Array.from(mesh.getIndexData());
		assertEquals(data, [1, 2]);
		assertEquals(mesh.indexFormat, Mesh.IndexFormat.UINT_16);
		assertEquals(mesh.indexCount, 2);
	},
});

Deno.test({
	name: "setIndexData() with an array of numbers for index format UINT_32",
	fn() {
		const mesh = new Mesh();
		mesh.setIndexFormat(Mesh.IndexFormat.UINT_32);

		mesh.setIndexData([1, 2]);

		const data = Array.from(mesh.getIndexData());
		assertEquals(data, [1, 2]);
		assertEquals(mesh.indexFormat, Mesh.IndexFormat.UINT_32);
		assertEquals(mesh.indexCount, 2);
	},
});

Deno.test({
	name: "setIndexData() should fire onIndexBufferChange",
	fn() {
		const mesh = new Mesh();
		mesh.setIndexFormat(Mesh.IndexFormat.UINT_16);

		let onIndexBufferChangeCallCount = 0;
		mesh.onIndexBufferChange(() => {
			onIndexBufferChangeCallCount++;
		});

		mesh.setIndexData([1, 2]);
		assertEquals(onIndexBufferChangeCallCount, 1);
	},
});

Deno.test({
	name: "setVertexCount() with single unused attribute",
	fn() {
		const mesh = new Mesh();
		mesh.setVertexCount(2);
		mesh.setVertexData(Mesh.AttributeType.POSITION, [
			new Vec3(1, 2, 3),
			new Vec3(4, 5, 6),
		]);

		mesh.setVertexCount(3);

		const buffers = Array.from(mesh.getBuffers());
		assertEquals(buffers.length, 1);

		const data = Array.from(buffers[0].getVertexData(Mesh.AttributeType.POSITION));
		assertEquals(data.length, 3);
	},
});

class FakeVertexState {
	/**
	 * @param {unknown[]} buffers
	 */
	constructor(buffers) {
		this.buffers = buffers;
	}
}
const mockVertexStateSingleAttribute = /** @type {import("../../../../src/mod.js").VertexState} */ (new FakeVertexState([
	{
		attributes: new Map([
			[
				Mesh.AttributeType.POSITION,
				{
					attributeType: Mesh.AttributeType.POSITION,
					offset: 0,
					format: Mesh.AttributeFormat.FLOAT32,
					componentCount: 3,
				},
			],
		]),
	},
]));
const mockVertexStateTwoAttributes = /** @type {import("../../../../src/mod.js").VertexState} */ (new FakeVertexState([
	{
		attributes: new Map([
			[
				Mesh.AttributeType.POSITION,
				{
					attributeType: Mesh.AttributeType.POSITION,
					offset: 0,
					format: Mesh.AttributeFormat.FLOAT32,
					componentCount: 3,
				},
			],
			[
				Mesh.AttributeType.NORMAL,
				{
					attributeType: Mesh.AttributeType.NORMAL,
					offset: 12,
					format: Mesh.AttributeFormat.FLOAT32,
					componentCount: 3,
				},
			],
		]),
	},
]));

Deno.test({
	name: "setVertexCount() with attributes from VertexState",
	fn() {
		const mesh = new Mesh();
		mesh.setVertexState(mockVertexStateSingleAttribute);
		mesh.setVertexCount(2);
		mesh.setVertexData(Mesh.AttributeType.POSITION, [
			new Vec3(1, 2, 3),
			new Vec3(4, 5, 6),
		]);

		mesh.setVertexCount(3);

		const buffers = Array.from(mesh.getBuffers());
		assertEquals(buffers.length, 1);

		const data = Array.from(buffers[0].getVertexData(Mesh.AttributeType.POSITION));
		assertEquals(data.length, 3);
	},
});

Deno.test({
	name: "setVertexCount() with attributes from VertexState and unused attributes",
	fn() {
		const mesh = new Mesh();
		mesh.setVertexState(mockVertexStateSingleAttribute);
		mesh.setVertexCount(2);
		mesh.setVertexData(Mesh.AttributeType.POSITION, [
			new Vec3(1, 2, 3),
			new Vec3(4, 5, 6),
		]);
		mesh.setVertexData(Mesh.AttributeType.NORMAL, [
			new Vec3(1, 2, 3),
			new Vec3(4, 5, 6),
		]);

		mesh.setVertexCount(3);

		const buffers = Array.from(mesh.getBuffers());
		assertEquals(buffers.length, 2);

		const positionData = Array.from(buffers[0].getVertexData(Mesh.AttributeType.POSITION));
		assertEquals(positionData.length, 3);

		const normalData = Array.from(buffers[1].getVertexData(Mesh.AttributeType.NORMAL));
		assertEquals(normalData.length, 3);
	},
});

Deno.test({
	name: "setVertexData() for unused attribute",
	fn() {
		const mesh = new Mesh();
		mesh.setVertexCount(2);
		mesh.setVertexData(Mesh.AttributeType.POSITION, [
			new Vec3(1, 2, 3),
			new Vec3(4, 5, 6),
		]);

		const buffers = Array.from(mesh.getBuffers());
		assertEquals(buffers.length, 1);

		const positionData = Array.from(buffers[0].getVertexData(Mesh.AttributeType.POSITION));
		assertEquals(positionData.length, 2);
	},
});

Deno.test({
	name: "setVertexData() for attribute in VertexState",
	fn() {
		const mesh = new Mesh();
		mesh.setVertexCount(2);
		mesh.setVertexState(mockVertexStateSingleAttribute);
		mesh.setVertexData(Mesh.AttributeType.POSITION, [
			new Vec3(1, 2, 3),
			new Vec3(4, 5, 6),
		]);

		const buffers = Array.from(mesh.getBuffers());
		assertEquals(buffers.length, 1);

		const positionData = Array.from(buffers[0].getVertexData(Mesh.AttributeType.POSITION));
		assertEquals(positionData.length, 2);
	},
});

Deno.test({
	name: "getBufferForAttributeType() should create an unused buffer when it doesn't exist in the VertexState",
	fn() {
		const mesh = new Mesh();

		const result = mesh.getBufferForAttributeType(Mesh.AttributeType.POSITION);

		assertEquals(result.isUnused, true);
	},
});

Deno.test({
	name: "getBufferForAttributeType() should create buffers with the specified parameters when it doesn't exist in the VertexState",
	fn() {
		const mesh = new Mesh();

		const result = mesh.getBufferForAttributeType(Mesh.AttributeType.POSITION, {
			unusedComponentCount: 1,
			unusedFormat: Mesh.AttributeFormat.INT32,
		});

		assertEquals(result.isUnused, true);
		assertEquals(result.attributes.length, 1);
		assertEquals(result.attributes[0].componentCount, 1);
		assertEquals(result.attributes[0].format, Mesh.AttributeFormat.INT32);
	},
});

Deno.test({
	name: "getBufferForAttributeType() should return the existing buffer when it is unused",
	fn() {
		const mesh = new Mesh();

		const result1 = mesh.getBufferForAttributeType(Mesh.AttributeType.POSITION);
		const result2 = mesh.getBufferForAttributeType(Mesh.AttributeType.POSITION);

		assertStrictEquals(result1, result2);
	},
});

Deno.test({
	name: "getBufferForAttributeType() should return the existing buffer when it exists in the VertexState",
	fn() {
		const mesh = new Mesh();
		mesh.setVertexState(mockVertexStateSingleAttribute);
		mesh.setVertexCount(2);
		mesh.setVertexData(Mesh.AttributeType.POSITION, [
			new Vec3(1, 2, 3),
			new Vec3(4, 5, 6),
		]);

		const result1 = mesh.getBufferForAttributeType(Mesh.AttributeType.POSITION);
		const result2 = mesh.getBufferForAttributeType(Mesh.AttributeType.POSITION);

		assertStrictEquals(result1, result2);
		assertEquals(result1.isUnused, false);
	},
});

Deno.test({
	name: "getBuffers() should get all the buffers",
	fn() {
		const mesh = new Mesh();
		mesh.setVertexState(mockVertexStateSingleAttribute);
		mesh.setVertexCount(2);
		mesh.setVertexData(Mesh.AttributeType.POSITION, [
			new Vec3(1, 2, 3),
			new Vec3(4, 5, 6),
		]);
		mesh.setVertexData(Mesh.AttributeType.NORMAL, [
			new Vec3(1, 2, 3),
			new Vec3(4, 5, 6),
		]);

		const buffers = Array.from(mesh.getBuffers());

		assertEquals(buffers.length, 2);
	},
});

Deno.test({
	name: "getBuffers() should only get used buffers when includeUnused is false",
	fn() {
		const mesh = new Mesh();
		mesh.setVertexState(mockVertexStateSingleAttribute);
		mesh.setVertexCount(2);
		mesh.setVertexData(Mesh.AttributeType.POSITION, [
			new Vec3(1, 2, 3),
			new Vec3(4, 5, 6),
		]);
		mesh.setVertexData(Mesh.AttributeType.NORMAL, [
			new Vec3(1, 2, 3),
			new Vec3(4, 5, 6),
		]);

		const buffers = Array.from(mesh.getBuffers(false));

		assertEquals(buffers.length, 1);
	},
});

Deno.test({
	name: "setVertexState() should convert the buffers to the new vertex state",
	fn() {
		const mesh = new Mesh();
		mesh.setVertexState(mockVertexStateSingleAttribute);
		mesh.setVertexCount(2);
		mesh.setVertexData(Mesh.AttributeType.POSITION, [
			new Vec3(1, 2, 3),
			new Vec3(4, 5, 6),
		]);
		mesh.setVertexData(Mesh.AttributeType.NORMAL, [
			new Vec3(1, 2, 3),
			new Vec3(4, 5, 6),
		]);

		mesh.setVertexState(mockVertexStateTwoAttributes);

		const buffers = Array.from(mesh.getBuffers());

		assertEquals(buffers.length, 1);
		assertEquals(buffers[0].attributes.length, 2);
	},
});
