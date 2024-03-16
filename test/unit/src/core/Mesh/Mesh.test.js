import { assertEquals, assertExists, assertStrictEquals, assertThrows } from "std/testing/asserts.ts";
import { Mesh, Vec2, Vec3, Vec4 } from "../../../../../src/mod.js";
import { mockVertexStateColor, mockVertexStateSingleAttribute, mockVertexStateTwoAttributes, mockVertexStateUv } from "./shared.js";
import { assertVecAlmostEquals } from "../../../../../src/util/asserts.js";

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
	name: "Changing index buffer should result in new index data",
	fn() {
		const mesh = new Mesh();
		mesh.setIndexFormat(Mesh.IndexFormat.UINT_16);

		const buffer1 = new ArrayBuffer(6);
		const dataView1 = new DataView(buffer1);
		dataView1.setInt16(0, 1, true);
		dataView1.setInt16(2, 2, true);
		dataView1.setInt16(4, 3, true);
		mesh.setIndexData(buffer1);

		assertEquals(Array.from(mesh.getIndexData()), [1, 2, 3]);

		const buffer2 = new ArrayBuffer(6);
		const dataView2 = new DataView(buffer2);
		dataView2.setInt16(0, 4, true);
		dataView2.setInt16(2, 5, true);
		dataView2.setInt16(4, 6, true);
		mesh.setIndexData(buffer2);

		assertEquals(Array.from(mesh.getIndexData()), [4, 5, 6]);
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

		const data = Array.from(mesh.getVertexData(Mesh.AttributeType.POSITION));
		assertEquals(data.length, 3);
	},
});

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

		const data = Array.from(mesh.getVertexData(Mesh.AttributeType.POSITION));
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

		const positionData = Array.from(mesh.getVertexData(Mesh.AttributeType.POSITION));
		assertEquals(positionData.length, 3);

		const normalData = Array.from(mesh.getVertexData(Mesh.AttributeType.NORMAL));
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

		const positionData = Array.from(mesh.getVertexData(Mesh.AttributeType.POSITION));
		assertEquals(positionData.length, 2);
	},
});

Deno.test({
	name: "getVertexData() throws for non existent unused attributes",
	fn() {
		const mesh = new Mesh();
		mesh.setVertexCount(1);

		assertThrows(() => {
			mesh.getVertexData(Mesh.AttributeType.POSITION);
		}, Error, "This mesh does not contain an attribute with the specified type. Either add a vertex state that includes this attribute or add vertex data using setVertexData().")
	}
})

Deno.test({
	name: "setVertexData() for attribute in VertexState with vector 2",
	fn() {
		const mesh = new Mesh();
		mesh.setVertexCount(2);
		mesh.setVertexState(mockVertexStateUv);
		mesh.setVertexData(Mesh.AttributeType.UV1, [
			new Vec2(1, 2),
			new Vec2(3, 4),
		]);

		const positionData = Array.from(mesh.getVertexData(Mesh.AttributeType.UV1));
		assertEquals(positionData.length, 2);
		assertVecAlmostEquals(positionData[0], [1, 2]);
		assertVecAlmostEquals(positionData[1], [3, 4]);
	},
});

Deno.test({
	name: "setVertexData() for attribute in VertexState with vector 3",
	fn() {
		const mesh = new Mesh();
		mesh.setVertexCount(2);
		mesh.setVertexState(mockVertexStateSingleAttribute);
		mesh.setVertexData(Mesh.AttributeType.POSITION, [
			new Vec3(1, 2, 3),
			new Vec3(4, 5, 6),
		]);

		const positionData = Array.from(mesh.getVertexData(Mesh.AttributeType.POSITION));
		assertEquals(positionData.length, 2);
		assertVecAlmostEquals(positionData[0], [1, 2, 3]);
		assertVecAlmostEquals(positionData[1], [4, 5, 6]);
	},
});

Deno.test({
	name: "setVertexData() for attribute in VertexState with vector 4",
	fn() {
		const mesh = new Mesh();
		mesh.setVertexCount(2);
		mesh.setVertexState(mockVertexStateColor);
		mesh.setVertexData(Mesh.AttributeType.COLOR, [
			new Vec4(1, 2, 3, 4),
			new Vec4(5, 6, 7, 8),
		]);

		const positionData = Array.from(mesh.getVertexData(Mesh.AttributeType.COLOR));
		assertEquals(positionData.length, 2);
		assertVecAlmostEquals(positionData[0], [1, 2, 3, 4]);
		assertVecAlmostEquals(positionData[1], [5, 6, 7, 8]);
	},
});

Deno.test({
	name: "getBufferForAttributeType() should create an unused buffer when it doesn't exist in the VertexState",
	fn() {
		const mesh = new Mesh();
		mesh.setVertexCount(1);

		const buffer1 = mesh.getAttributeBufferForType(Mesh.AttributeType.POSITION);
		assertEquals(buffer1, null);

		mesh.setVertexData(Mesh.AttributeType.POSITION, [new Vec3(1, 2, 3)]);
		const buffer2 = mesh.getAttributeBufferForType(Mesh.AttributeType.POSITION);
		assertExists(buffer2);
		assertEquals(buffer2.isUnused, true);
	},
});

Deno.test({
	name: "getBufferForAttributeType() should create buffers with the specified parameters when it doesn't exist in the VertexState",
	fn() {
		const mesh = new Mesh();
		mesh.setVertexCount(3);

		const buffer1 = mesh.getAttributeBufferForType(Mesh.AttributeType.POSITION);
		assertEquals(buffer1, null);

		mesh.setVertexData(Mesh.AttributeType.POSITION, [1, 2, 3], {
			unusedComponentCount: 1,
			unusedFormat: Mesh.AttributeFormat.INT32,
		});

		const buffer2 = mesh.getAttributeBufferForType(Mesh.AttributeType.POSITION);
		assertExists(buffer2);
		assertEquals(buffer2.isUnused, true);
		assertEquals(buffer2.attributes.length, 1);
		assertEquals(buffer2.attributes[0].componentCount, 1);
		assertEquals(buffer2.attributes[0].format, Mesh.AttributeFormat.INT32);
	},
});

Deno.test({
	name: "getBufferForAttributeType() should return the existing buffer when it is unused",
	fn() {
		const mesh = new Mesh();
		mesh.setVertexCount(3);
		mesh.setVertexData(Mesh.AttributeType.POSITION, []);

		const result1 = mesh.getAttributeBufferForType(Mesh.AttributeType.POSITION);
		const result2 = mesh.getAttributeBufferForType(Mesh.AttributeType.POSITION);

		assertExists(result1);
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

		const result1 = mesh.getAttributeBufferForType(Mesh.AttributeType.POSITION);
		const result2 = mesh.getAttributeBufferForType(Mesh.AttributeType.POSITION);

		assertExists(result1);
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

		const buffers = Array.from(mesh.getAttributeBuffers());

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

		const buffers = Array.from(mesh.getAttributeBuffers(false));

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

		const result1 = mesh.getAttributeBufferForType(Mesh.AttributeType.POSITION);
		assertExists(result1);
		assertEquals(result1.isUnused, false);
		const result2 = mesh.getAttributeBufferForType(Mesh.AttributeType.NORMAL);
		assertExists(result2);
		assertEquals(result2.isUnused, true);
		assertEquals(Array.from(mesh.getAttributeBuffers()).length, 2);

		mesh.setVertexState(mockVertexStateTwoAttributes);

		assertEquals(Array.from(mesh.getAttributeBuffers()).length, 1);

		const positions = Array.from(mesh.getVertexData(Mesh.AttributeType.POSITION));
		assertEquals(positions.length, 2);
		assertVecAlmostEquals(positions[0], [1, 2, 3]);
		assertVecAlmostEquals(positions[1], [4, 5, 6]);

		const normals = Array.from(mesh.getVertexData(Mesh.AttributeType.NORMAL));
		assertEquals(normals.length, 2);
		assertVecAlmostEquals(normals[0], [1, 2, 3]);
		assertVecAlmostEquals(normals[1], [4, 5, 6]);
	},
});
