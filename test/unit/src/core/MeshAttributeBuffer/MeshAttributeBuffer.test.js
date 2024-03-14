import { assertEquals, assertExists, assertThrows } from "std/testing/asserts.ts";
import { Mesh, Vec2, Vec3, Vec4 } from "../../../../../src/mod.js";
import { assertVecAlmostEquals } from "../../../../../src/util/asserts.js";
import { MeshAttributeBuffer } from "../../../../../src/core/MeshAttributeBuffer.js";

Deno.test({
	name: "throw an error when creating an unused buffer with not exactly one attribute",
	fn() {
		assertThrows(() => {
			new MeshAttributeBuffer({
				isUnused: true,
				attributes: [],
			});
		}, Error, "Unused attribute buffers must have exactly 1 attribute.");

		assertThrows(() => {
			new MeshAttributeBuffer({
				isUnused: true,
				attributes: [
					{ offset: 0, format: Mesh.AttributeFormat.FLOAT32, componentCount: 1, attributeType: Mesh.AttributeType.POSITION },
					{ offset: 4, format: Mesh.AttributeFormat.FLOAT32, componentCount: 1, attributeType: Mesh.AttributeType.NORMAL },
				],
			});
		}, Error, "Unused attribute buffers must have exactly 1 attribute.");
	},
});

Deno.test({
	name: "setArrayStride() sets the specified array stride when not null",
	fn() {
		const buffer1 = new MeshAttributeBuffer();
		buffer1.setArrayStride(5);
		assertEquals(buffer1.arrayStride, 5);

		const buffer2 = new MeshAttributeBuffer();
		buffer2.setArrayStride(10);
		assertEquals(buffer2.arrayStride, 10);
	},
});

Deno.test({
	name: "setArrayStride() computes the max required array stride when null",
	fn() {
		const buffer1 = new MeshAttributeBuffer({
			attributes: [
				{ offset: 0, format: Mesh.AttributeFormat.FLOAT32, componentCount: 1, attributeType: Mesh.AttributeType.POSITION },
				{ offset: 4, format: Mesh.AttributeFormat.FLOAT32, componentCount: 1, attributeType: Mesh.AttributeType.NORMAL },
			],
		});
		buffer1.setArrayStride(null);
		// Float32 (4 bytes) + Float32 (4 bytes) = 8 bytes
		assertEquals(buffer1.arrayStride, 8);

		const buffer2 = new MeshAttributeBuffer({
			attributes: [
				{ offset: 0, format: Mesh.AttributeFormat.FLOAT32, componentCount: 1, attributeType: Mesh.AttributeType.POSITION },
				{ offset: 4, format: Mesh.AttributeFormat.FLOAT32, componentCount: 3, attributeType: Mesh.AttributeType.NORMAL },
			],
		});
		buffer2.setArrayStride(null);
		// Float32 (4 bytes) + Float32 * 3 (12 bytes) = 16 bytes
		assertEquals(buffer2.arrayStride, 16);
	},
});

Deno.test({
	name: "Changing buffer should result in new vertex data",
	fn() {
		const buffer = new MeshAttributeBuffer({
			isUnused: true,
			attributes: [
				{
					attributeType: Mesh.AttributeType.POSITION,
					componentCount: 1,
					format: Mesh.AttributeFormat.INT16,
					offset: 0,
				},
			],
		});
		buffer.setVertexCount(2);

		buffer.setVertexData(Mesh.AttributeType.POSITION, [1, 2], false);
		assertEquals(Array.from(buffer.getVertexData(Mesh.AttributeType.POSITION)), [1, 2]);

		// Changing the size of the data causes a new ArrayBuffer to be created
		// This allows us to test if the DataView was invalidated.
		buffer.setVertexCount(3);
		buffer.setVertexData(Mesh.AttributeType.POSITION, [4, 5, 6], false);
		assertEquals(Array.from(buffer.getVertexData(Mesh.AttributeType.POSITION)), [4, 5, 6]);
	},
});

Deno.test({
	name: "hasAttributeType() should return true when the attribute type is present",
	fn() {
		const buffer = new MeshAttributeBuffer({
			attributes: [{ offset: 0, format: Mesh.AttributeFormat.FLOAT32, componentCount: 1, attributeType: Mesh.AttributeType.COLOR }],
		});

		const result = buffer.hasAttributeType(Mesh.AttributeType.COLOR);

		assertEquals(result, true);
	},
});

Deno.test({
	name: "hasAttributeType() should return false when the attribute type is not present",
	fn() {
		const buffer = new MeshAttributeBuffer({
			attributes: [{ offset: 0, format: Mesh.AttributeFormat.FLOAT32, componentCount: 1, attributeType: Mesh.AttributeType.COLOR }],
		});

		const result = buffer.hasAttributeType(Mesh.AttributeType.POSITION);

		assertEquals(result, false);
	},
});

Deno.test({
	name: "getAttributeSettings() should return the attribute settings for the specified attribute type",
	fn() {
		const buffer = new MeshAttributeBuffer({
			attributes: [{ offset: 0, format: Mesh.AttributeFormat.FLOAT32, componentCount: 1, attributeType: Mesh.AttributeType.COLOR }],
		});

		const result = buffer.getAttributeSettings(Mesh.AttributeType.COLOR);

		assertExists(result);
		assertEquals(result.offset, 0);
		assertEquals(result.format, Mesh.AttributeFormat.FLOAT32);
		assertEquals(result.componentCount, 1);
		assertEquals(result.attributeType, Mesh.AttributeType.COLOR);
	},
});

Deno.test({
	name: "getAttributeSettings() should return null when the attribute type is not present",
	fn() {
		const buffer = new MeshAttributeBuffer({
			attributes: [{ offset: 0, format: Mesh.AttributeFormat.FLOAT32, componentCount: 1, attributeType: Mesh.AttributeType.COLOR }],
		});

		const result = buffer.getAttributeSettings(Mesh.AttributeType.POSITION);

		assertEquals(result, null);
	},
});

Deno.test({
	name: "setVertexCount() should keep data from the old buffer",
	fn() {
		const buffer = new MeshAttributeBuffer({
			attributes: [{ offset: 0, format: Mesh.AttributeFormat.FLOAT32, componentCount: 3, attributeType: Mesh.AttributeType.POSITION }],
		});
		buffer.setVertexCount(1);
		buffer.setVertexData(Mesh.AttributeType.POSITION, [new Vec3(1, 2, 3)], false);

		buffer.setVertexCount(2);

		const data1 = Array.from(buffer.getVertexData(Mesh.AttributeType.POSITION));
		assertEquals(data1.length, 2);
		assertVecAlmostEquals(data1[0], [1, 2, 3]);
		assertVecAlmostEquals(data1[1], [0, 0, 0]);

		const dataView1 = new DataView(buffer.buffer);
		assertEquals(dataView1.getFloat32(0, true), 1);
		assertEquals(dataView1.getFloat32(4, true), 2);
		assertEquals(dataView1.getFloat32(8, true), 3);
		assertEquals(dataView1.getFloat32(12, true), 0);
		assertEquals(dataView1.getFloat32(16, true), 0);
		assertEquals(dataView1.getFloat32(20, true), 0);

		buffer.setVertexCount(1);

		const data2 = Array.from(buffer.getVertexData(Mesh.AttributeType.POSITION));
		assertEquals(data2.length, 1);
		assertVecAlmostEquals(data2[0], [1, 2, 3]);

		const dataView2 = new DataView(buffer.buffer);
		assertEquals(dataView2.getFloat32(0, true), 1);
		assertEquals(dataView2.getFloat32(4, true), 2);
		assertEquals(dataView2.getFloat32(8, true), 3);
	},
});

Deno.test({
	name: "setVertexCount() fires onBufferChanged callbacks",
	fn() {
		const buffer = new MeshAttributeBuffer({});
		buffer.setVertexCount(0);

		let onBufferChangedCalled = false;
		buffer.onBufferChanged(() => {
			onBufferChangedCalled = true;
		});

		buffer.setVertexCount(1);

		assertEquals(onBufferChangedCalled, true);
	},
});

Deno.test({
	name: "setVertexData() shouldn't affect other attributes",
	fn() {
		const buffer = new MeshAttributeBuffer({
			attributes: [
				{ offset: 0, format: Mesh.AttributeFormat.FLOAT32, componentCount: 1, attributeType: Mesh.AttributeType.POSITION },
				{ offset: 4, format: Mesh.AttributeFormat.FLOAT32, componentCount: 1, attributeType: Mesh.AttributeType.NORMAL },
			],
		});
		buffer.setVertexCount(3);

		buffer.setVertexData(Mesh.AttributeType.POSITION, [1, 2, 3], false);

		buffer.setVertexData(Mesh.AttributeType.NORMAL, [4, 5, 6], false);
		const positionData1 = Array.from(buffer.getVertexData(Mesh.AttributeType.POSITION));
		assertEquals(positionData1, [1, 2, 3]);

		buffer.setVertexData(Mesh.AttributeType.NORMAL, [], false);
		const positionData2 = Array.from(buffer.getVertexData(Mesh.AttributeType.POSITION));
		assertEquals(positionData2, [1, 2, 3]);
	},
});

Deno.test({
	name: "setVertexData() with an ArrayBuffer",
	fn() {
		const buffer = new MeshAttributeBuffer({
			attributes: [{ offset: 0, format: Mesh.AttributeFormat.FLOAT32, componentCount: 1, attributeType: Mesh.AttributeType.POSITION }],
		});
		buffer.setVertexCount(3);

		const arrayBuffer = new ArrayBuffer(4 * 3);
		const dataView1 = new DataView(arrayBuffer);
		dataView1.setFloat32(0, 1, true);
		dataView1.setFloat32(4, 2, true);
		dataView1.setFloat32(8, 3, true);
		buffer.setVertexData(Mesh.AttributeType.POSITION, arrayBuffer, false);

		assertEquals(Array.from(buffer.getVertexData(Mesh.AttributeType.POSITION)), [1, 2, 3]);

		const dataView2 = new DataView(buffer.buffer);
		assertEquals(dataView2.getFloat32(0, true), 1);
		assertEquals(dataView2.getFloat32(4, true), 2);
		assertEquals(dataView2.getFloat32(8, true), 3);
	},
});

Deno.test({
	name: "setVertexData() with an TypedArray",
	fn() {
		const buffer = new MeshAttributeBuffer({
			attributes: [{ offset: 0, format: Mesh.AttributeFormat.FLOAT32, componentCount: 1, attributeType: Mesh.AttributeType.POSITION }],
		});
		buffer.setVertexCount(3);

		const arrayBuffer = new ArrayBuffer(4 * 4);
		const dataView1 = new DataView(arrayBuffer);
		dataView1.setFloat32(4, 1, true);
		dataView1.setFloat32(8, 2, true);
		dataView1.setFloat32(12, 3, true);
		const typedArray = new Float32Array(arrayBuffer, 4, 3);
		buffer.setVertexData(Mesh.AttributeType.POSITION, typedArray, false);

		assertEquals(Array.from(buffer.getVertexData(Mesh.AttributeType.POSITION)), [1, 2, 3]);

		const dataView2 = new DataView(buffer.buffer);
		assertEquals(dataView2.getFloat32(0, true), 1);
		assertEquals(dataView2.getFloat32(4, true), 2);
		assertEquals(dataView2.getFloat32(8, true), 3);
	},
});

Deno.test({
	name: "setVertexData() array of numbers",
	fn() {
		const buffer = new MeshAttributeBuffer({
			attributes: [{ offset: 0, format: Mesh.AttributeFormat.FLOAT32, componentCount: 1, attributeType: Mesh.AttributeType.POSITION }],
		});
		buffer.setVertexCount(3);

		buffer.setVertexData(Mesh.AttributeType.POSITION, [1, 2, 3], false);

		assertEquals(Array.from(buffer.getVertexData(Mesh.AttributeType.POSITION)), [1, 2, 3]);

		const dataView = new DataView(buffer.buffer);
		assertEquals(dataView.getFloat32(0, true), 1);
		assertEquals(dataView.getFloat32(4, true), 2);
		assertEquals(dataView.getFloat32(8, true), 3);
	},
});

Deno.test({
	name: "setVertexData() array of Vec2",
	fn() {
		const buffer = new MeshAttributeBuffer({
			attributes: [{ offset: 0, format: Mesh.AttributeFormat.FLOAT32, componentCount: 2, attributeType: Mesh.AttributeType.POSITION }],
		});
		buffer.setVertexCount(2);

		buffer.setVertexData(Mesh.AttributeType.POSITION, [new Vec2(1, 2), new Vec2(3, 4)], false);

		const data = Array.from(buffer.getVertexData(Mesh.AttributeType.POSITION));
		assertEquals(data.length, 2);
		assertVecAlmostEquals(data[0], [1, 2]);
		assertVecAlmostEquals(data[1], [3, 4]);

		const dataView = new DataView(buffer.buffer);
		assertEquals(dataView.getFloat32(0, true), 1);
		assertEquals(dataView.getFloat32(4, true), 2);
		assertEquals(dataView.getFloat32(8, true), 3);
		assertEquals(dataView.getFloat32(12, true), 4);
	},
});

Deno.test({
	name: "setVertexData() array of Vec3",
	fn() {
		const buffer = new MeshAttributeBuffer({
			attributes: [{ offset: 0, format: Mesh.AttributeFormat.FLOAT32, componentCount: 3, attributeType: Mesh.AttributeType.POSITION }],
		});
		buffer.setVertexCount(2);

		buffer.setVertexData(Mesh.AttributeType.POSITION, [new Vec3(1, 2, 3), new Vec3(4, 5, 6)], false);

		const data = Array.from(buffer.getVertexData(Mesh.AttributeType.POSITION));
		assertEquals(data.length, 2);
		assertVecAlmostEquals(data[0], [1, 2, 3]);
		assertVecAlmostEquals(data[1], [4, 5, 6]);

		const dataView = new DataView(buffer.buffer);
		assertEquals(dataView.getFloat32(0, true), 1);
		assertEquals(dataView.getFloat32(4, true), 2);
		assertEquals(dataView.getFloat32(8, true), 3);
		assertEquals(dataView.getFloat32(12, true), 4);
		assertEquals(dataView.getFloat32(16, true), 5);
		assertEquals(dataView.getFloat32(20, true), 6);
	},
});

Deno.test({
	name: "setVertexData() array of Vec4",
	fn() {
		const buffer = new MeshAttributeBuffer({
			attributes: [{ offset: 0, format: Mesh.AttributeFormat.FLOAT32, componentCount: 4, attributeType: Mesh.AttributeType.POSITION }],
		});
		buffer.setVertexCount(2);

		buffer.setVertexData(Mesh.AttributeType.POSITION, [new Vec4(1, 2, 3, 4), new Vec4(5, 6, 7, 8)], false);

		const data = Array.from(buffer.getVertexData(Mesh.AttributeType.POSITION));
		assertEquals(data.length, 2);
		assertVecAlmostEquals(data[0], [1, 2, 3, 4]);
		assertVecAlmostEquals(data[1], [5, 6, 7, 8]);

		const dataView = new DataView(buffer.buffer);
		assertEquals(dataView.getFloat32(0, true), 1);
		assertEquals(dataView.getFloat32(4, true), 2);
		assertEquals(dataView.getFloat32(8, true), 3);
		assertEquals(dataView.getFloat32(12, true), 4);
		assertEquals(dataView.getFloat32(16, true), 5);
		assertEquals(dataView.getFloat32(20, true), 6);
		assertEquals(dataView.getFloat32(24, true), 7);
		assertEquals(dataView.getFloat32(28, true), 8);
	},
});

Deno.test({
	name: "setVertexData() should throw when the attribute type is not present",
	fn() {
		const buffer = new MeshAttributeBuffer();
		buffer.setVertexCount(2);
		assertThrows(() => {
			buffer.setVertexData(Mesh.AttributeType.POSITION, [new Vec3(1, 2, 3), new Vec3(4, 5, 6)], false);
		}, Error, "Attribute type not found in vertex state.");
	},
});

Deno.test({
	name: "setVertexData() should throw when data doesn't match the component count (1)",
	fn() {
		const buffer = new MeshAttributeBuffer({
			attributes: [{ offset: 0, format: Mesh.AttributeFormat.FLOAT32, componentCount: 1, attributeType: Mesh.AttributeType.POSITION }],
		});
		buffer.setVertexCount(2);

		assertThrows(() => {
			buffer.setVertexData(Mesh.AttributeType.POSITION, [new Vec2(), new Vec2()], false);
		}, Error, `Expected a number array but received a Vec2 array.
The VertexState for this attribute has a componentCount of 1.
Potential fixes:
 - set the componentCount of "POSITION" in your VertexState to 2.
 - provide a number array.`);

		assertThrows(() => {
			buffer.setVertexData(Mesh.AttributeType.POSITION, [new Vec3(), new Vec3()], false);
		}, Error, `Expected a number array but received a Vec3 array.
The VertexState for this attribute has a componentCount of 1.
Potential fixes:
 - set the componentCount of "POSITION" in your VertexState to 3.
 - provide a number array.`);

		assertThrows(() => {
			buffer.setVertexData(Mesh.AttributeType.POSITION, [new Vec4(), new Vec4()], false);
		}, Error, `Expected a number array but received a Vec4 array.
The VertexState for this attribute has a componentCount of 1.
Potential fixes:
 - set the componentCount of "POSITION" in your VertexState to 4.
 - provide a number array.`);
	},
});

Deno.test({
	name: "setVertexData() should throw when data doesn't match the component count (1 unused)",
	fn() {
		const buffer = new MeshAttributeBuffer({
			isUnused: true,
			attributes: [{ offset: 0, format: Mesh.AttributeFormat.FLOAT32, componentCount: 1, attributeType: Mesh.AttributeType.POSITION }],
		});
		buffer.setVertexCount(2);

		assertThrows(() => {
			buffer.setVertexData(Mesh.AttributeType.POSITION, [new Vec2(), new Vec2()], false);
		}, Error, `Expected a number array but received a Vec2 array.
The mesh has no VertexState.
Potential fixes:
 - add a VertexState with "POSITION" attribute.
 - set the \`unusedComponentCount\` option of \`setVertexData()\` to 2.
 - provide a number array.`);

		assertThrows(() => {
			buffer.setVertexData(Mesh.AttributeType.POSITION, [new Vec3(), new Vec3()], false);
		}, Error, `Expected a number array but received a Vec3 array.
The mesh has no VertexState.
Potential fixes:
 - add a VertexState with "POSITION" attribute.
 - set the \`unusedComponentCount\` option of \`setVertexData()\` to 3.
 - provide a number array.`);

		assertThrows(() => {
			buffer.setVertexData(Mesh.AttributeType.POSITION, [new Vec4(), new Vec4()], false);
		}, Error, `Expected a number array but received a Vec4 array.
The mesh has no VertexState.
Potential fixes:
 - add a VertexState with "POSITION" attribute.
 - set the \`unusedComponentCount\` option of \`setVertexData()\` to 4.
 - provide a number array.`);
	},
});

Deno.test({
	name: "setVertexData() should throw when data doesn't match the component count (2)",
	fn() {
		const buffer = new MeshAttributeBuffer({
			attributes: [{ offset: 0, format: Mesh.AttributeFormat.FLOAT32, componentCount: 2, attributeType: Mesh.AttributeType.POSITION }],
		});
		buffer.setVertexCount(2);

		assertThrows(() => {
			buffer.setVertexData(Mesh.AttributeType.POSITION, [1, 2], false);
		}, Error, `Expected a Vec2 array but received a Number array.
The VertexState for this attribute has a componentCount of 2.
Potential fixes:
 - set the componentCount of "POSITION" in your VertexState to 1.
 - provide a Vec2 array.`);

		assertThrows(() => {
			buffer.setVertexData(Mesh.AttributeType.POSITION, [new Vec3(), new Vec3()], false);
		}, Error, `Expected a Vec2 array but received a Vec3 array.
The VertexState for this attribute has a componentCount of 2.
Potential fixes:
 - set the componentCount of "POSITION" in your VertexState to 3.
 - provide a Vec2 array.`);

		assertThrows(() => {
			buffer.setVertexData(Mesh.AttributeType.POSITION, [new Vec4(), new Vec4()], false);
		}, Error, `Expected a Vec2 array but received a Vec4 array.
The VertexState for this attribute has a componentCount of 2.
Potential fixes:
 - set the componentCount of "POSITION" in your VertexState to 4.
 - provide a Vec2 array.`);
	},
});

Deno.test({
	name: "setVertexData() should throw when data doesn't match the component count (2 unused)",
	fn() {
		const buffer = new MeshAttributeBuffer({
			isUnused: true,
			attributes: [{ offset: 0, format: Mesh.AttributeFormat.FLOAT32, componentCount: 2, attributeType: Mesh.AttributeType.POSITION }],
		});
		buffer.setVertexCount(2);

		assertThrows(() => {
			buffer.setVertexData(Mesh.AttributeType.POSITION, [1, 2], false);
		}, Error, `Expected a Vec2 array but received a Number array.
The mesh has no VertexState.
Potential fixes:
 - add a VertexState with "POSITION" attribute.
 - set the \`unusedComponentCount\` option of \`setVertexData()\` to 1.
 - provide a Vec2 array.`);

		assertThrows(() => {
			buffer.setVertexData(Mesh.AttributeType.POSITION, [new Vec3(), new Vec3()], false);
		}, Error, `Expected a Vec2 array but received a Vec3 array.
The mesh has no VertexState.
Potential fixes:
 - add a VertexState with "POSITION" attribute.
 - set the \`unusedComponentCount\` option of \`setVertexData()\` to 3.
 - provide a Vec2 array.`);

		assertThrows(() => {
			buffer.setVertexData(Mesh.AttributeType.POSITION, [new Vec4(), new Vec4()], false);
		}, Error, `Expected a Vec2 array but received a Vec4 array.
The mesh has no VertexState.
Potential fixes:
 - add a VertexState with "POSITION" attribute.
 - set the \`unusedComponentCount\` option of \`setVertexData()\` to 4.
 - provide a Vec2 array.`);
	},
});

Deno.test({
	name: "setVertexData() should throw when data doesn't match the component count (3)",
	fn() {
		const buffer = new MeshAttributeBuffer({
			attributes: [{ offset: 0, format: Mesh.AttributeFormat.FLOAT32, componentCount: 3, attributeType: Mesh.AttributeType.POSITION }],
		});
		buffer.setVertexCount(2);

		assertThrows(() => {
			buffer.setVertexData(Mesh.AttributeType.POSITION, [1, 2], false);
		}, Error, `Expected a Vec3 array but received a Number array.
The VertexState for this attribute has a componentCount of 3.
Potential fixes:
 - set the componentCount of "POSITION" in your VertexState to 1.
 - provide a Vec3 array.`);

		assertThrows(() => {
			buffer.setVertexData(Mesh.AttributeType.POSITION, [new Vec2(), new Vec2()], false);
		}, Error, `Expected a Vec3 array but received a Vec2 array.
The VertexState for this attribute has a componentCount of 3.
Potential fixes:
 - set the componentCount of "POSITION" in your VertexState to 2.
 - provide a Vec3 array.`);

		assertThrows(() => {
			buffer.setVertexData(Mesh.AttributeType.POSITION, [new Vec4(), new Vec4()], false);
		}, Error, `Expected a Vec3 array but received a Vec4 array.
The VertexState for this attribute has a componentCount of 3.
Potential fixes:
 - set the componentCount of "POSITION" in your VertexState to 4.
 - provide a Vec3 array.`);
	},
});

Deno.test({
	name: "setVertexData() should throw when data doesn't match the component count (3 unused)",
	fn() {
		const buffer = new MeshAttributeBuffer({
			isUnused: true,
			attributes: [{ offset: 0, format: Mesh.AttributeFormat.FLOAT32, componentCount: 3, attributeType: Mesh.AttributeType.POSITION }],
		});
		buffer.setVertexCount(2);

		assertThrows(() => {
			buffer.setVertexData(Mesh.AttributeType.POSITION, [1, 2], false);
		}, Error, `Expected a Vec3 array but received a Number array.
The mesh has no VertexState.
Potential fixes:
 - add a VertexState with "POSITION" attribute.
 - set the \`unusedComponentCount\` option of \`setVertexData()\` to 1.
 - provide a Vec3 array.`);

		assertThrows(() => {
			buffer.setVertexData(Mesh.AttributeType.POSITION, [new Vec2(), new Vec2()], false);
		}, Error, `Expected a Vec3 array but received a Vec2 array.
The mesh has no VertexState.
Potential fixes:
 - add a VertexState with "POSITION" attribute.
 - set the \`unusedComponentCount\` option of \`setVertexData()\` to 2.
 - provide a Vec3 array.`);

		assertThrows(() => {
			buffer.setVertexData(Mesh.AttributeType.POSITION, [new Vec4(), new Vec4()], false);
		}, Error, `Expected a Vec3 array but received a Vec4 array.
The mesh has no VertexState.
Potential fixes:
 - add a VertexState with "POSITION" attribute.
 - set the \`unusedComponentCount\` option of \`setVertexData()\` to 4.
 - provide a Vec3 array.`);
	},
});

Deno.test({
	name: "setVertexData() should throw when data doesn't match the component count (4)",
	fn() {
		const buffer = new MeshAttributeBuffer({
			attributes: [{ offset: 0, format: Mesh.AttributeFormat.FLOAT32, componentCount: 4, attributeType: Mesh.AttributeType.POSITION }],
		});
		buffer.setVertexCount(2);

		assertThrows(() => {
			buffer.setVertexData(Mesh.AttributeType.POSITION, [1, 2], false);
		}, Error, `Expected a Vec4 array but received a Number array.
The VertexState for this attribute has a componentCount of 4.
Potential fixes:
 - set the componentCount of "POSITION" in your VertexState to 1.
 - provide a Vec4 array.`);

		assertThrows(() => {
			buffer.setVertexData(Mesh.AttributeType.POSITION, [new Vec2(), new Vec2()], false);
		}, Error, `Expected a Vec4 array but received a Vec2 array.
The VertexState for this attribute has a componentCount of 4.
Potential fixes:
 - set the componentCount of "POSITION" in your VertexState to 2.
 - provide a Vec4 array.`);

		assertThrows(() => {
			buffer.setVertexData(Mesh.AttributeType.POSITION, [new Vec3(), new Vec3()], false);
		}, Error, `Expected a Vec4 array but received a Vec3 array.
The VertexState for this attribute has a componentCount of 4.
Potential fixes:
 - set the componentCount of "POSITION" in your VertexState to 3.
 - provide a Vec4 array.`);
	},
});

Deno.test({
	name: "setVertexData() should throw when data doesn't match the component count (4 unused)",
	fn() {
		const buffer = new MeshAttributeBuffer({
			isUnused: true,
			attributes: [{ offset: 0, format: Mesh.AttributeFormat.FLOAT32, componentCount: 4, attributeType: Mesh.AttributeType.POSITION }],
		});
		buffer.setVertexCount(2);

		assertThrows(() => {
			buffer.setVertexData(Mesh.AttributeType.POSITION, [1, 2], false);
		}, Error, `Expected a Vec4 array but received a Number array.
The mesh has no VertexState.
Potential fixes:
 - add a VertexState with "POSITION" attribute.
 - set the \`unusedComponentCount\` option of \`setVertexData()\` to 1.
 - provide a Vec4 array.`);

		assertThrows(() => {
			buffer.setVertexData(Mesh.AttributeType.POSITION, [new Vec2(), new Vec2()], false);
		}, Error, `Expected a Vec4 array but received a Vec2 array.
The mesh has no VertexState.
Potential fixes:
 - add a VertexState with "POSITION" attribute.
 - set the \`unusedComponentCount\` option of \`setVertexData()\` to 2.
 - provide a Vec4 array.`);

		assertThrows(() => {
			buffer.setVertexData(Mesh.AttributeType.POSITION, [new Vec3(), new Vec3()], false);
		}, Error, `Expected a Vec4 array but received a Vec3 array.
The mesh has no VertexState.
Potential fixes:
 - add a VertexState with "POSITION" attribute.
 - set the \`unusedComponentCount\` option of \`setVertexData()\` to 3.
 - provide a Vec4 array.`);
	},
});

Deno.test({
	name: "setVertexData() should throw when data doesn't match the component count (4 unused with vertexstate)",
	fn() {
		const buffer = new MeshAttributeBuffer({
			isUnused: true,
			attributes: [{ offset: 0, format: Mesh.AttributeFormat.FLOAT32, componentCount: 4, attributeType: Mesh.AttributeType.POSITION }],
		});
		buffer.setVertexCount(2);

		assertThrows(() => {
			buffer.setVertexData(Mesh.AttributeType.POSITION, [1, 2], true);
		}, Error, `Expected a Vec4 array but received a Number array.
The provided VertexState doesn't contain a "POSITION" attribute.
Potential fixes:
 - add a "POSITION" attribute to the VertexState.
 - set the \`unusedComponentCount\` option of \`setVertexData()\` to 1.
 - provide a Vec4 array.`);

		assertThrows(() => {
			buffer.setVertexData(Mesh.AttributeType.POSITION, [new Vec2(), new Vec2()], true);
		}, Error, `Expected a Vec4 array but received a Vec2 array.
The provided VertexState doesn't contain a "POSITION" attribute.
Potential fixes:
 - add a "POSITION" attribute to the VertexState.
 - set the \`unusedComponentCount\` option of \`setVertexData()\` to 2.
 - provide a Vec4 array.`);

		assertThrows(() => {
			buffer.setVertexData(Mesh.AttributeType.POSITION, [new Vec3(), new Vec3()], true);
		}, Error, `Expected a Vec4 array but received a Vec3 array.
The provided VertexState doesn't contain a "POSITION" attribute.
Potential fixes:
 - add a "POSITION" attribute to the VertexState.
 - set the \`unusedComponentCount\` option of \`setVertexData()\` to 3.
 - provide a Vec4 array.`);
	},
});

Deno.test({
	name: "setVertexData() should fire onBufferChanged callbacks",
	fn() {
		const buffer = new MeshAttributeBuffer({
			attributes: [{ offset: 0, format: Mesh.AttributeFormat.FLOAT32, componentCount: 3, attributeType: Mesh.AttributeType.POSITION }],
		});
		buffer.setVertexCount(2);

		let onBufferChangedCalled = false;
		buffer.onBufferChanged(() => {
			onBufferChangedCalled = true;
		});

		buffer.setVertexData(Mesh.AttributeType.POSITION, [new Vec3(1, 2, 3), new Vec3(4, 5, 6)], false);

		assertEquals(onBufferChangedCalled, true);
	},
});

Deno.test({
	name: "getVertexData() should yield nothing when the buffer is empty",
	fn() {
		const buffer = new MeshAttributeBuffer({
			attributes: [{ offset: 0, format: Mesh.AttributeFormat.FLOAT32, componentCount: 3, attributeType: Mesh.AttributeType.POSITION }],
		});
		buffer.setVertexCount(0);

		const result = Array.from(buffer.getVertexData(Mesh.AttributeType.POSITION));

		assertEquals(result, []);
	},
});

Deno.test({
	name: "getVertexData() yielding numbers",
	fn() {
		const buffer = new MeshAttributeBuffer({
			attributes: [{ offset: 0, format: Mesh.AttributeFormat.FLOAT32, componentCount: 1, attributeType: Mesh.AttributeType.POSITION }],
		});
		buffer.setVertexCount(3);
		buffer.setVertexData(Mesh.AttributeType.POSITION, [1, 2, 3], false);

		const result = Array.from(buffer.getVertexData(Mesh.AttributeType.POSITION));

		assertEquals(result, [1, 2, 3]);
	},
});

Deno.test({
	name: "getVertexData() yielding Vec2",
	fn() {
		const buffer = new MeshAttributeBuffer({
			attributes: [{ offset: 0, format: Mesh.AttributeFormat.FLOAT32, componentCount: 2, attributeType: Mesh.AttributeType.POSITION }],
		});
		buffer.setVertexCount(2);
		buffer.setVertexData(Mesh.AttributeType.POSITION, [new Vec2(1, 2), new Vec2(4, 5)], false);

		const result = Array.from(buffer.getVertexData(Mesh.AttributeType.POSITION));

		assertEquals(result.length, 2);
		assertVecAlmostEquals(result[0], [1, 2]);
		assertVecAlmostEquals(result[1], [4, 5]);
	},
});

Deno.test({
	name: "getVertexData() yielding Vec3",
	fn() {
		const buffer = new MeshAttributeBuffer({
			attributes: [{ offset: 0, format: Mesh.AttributeFormat.FLOAT32, componentCount: 3, attributeType: Mesh.AttributeType.POSITION }],
		});
		buffer.setVertexCount(2);
		buffer.setVertexData(Mesh.AttributeType.POSITION, [new Vec3(1, 2, 3), new Vec3(4, 5, 6)], false);

		const result = Array.from(buffer.getVertexData(Mesh.AttributeType.POSITION));

		assertEquals(result.length, 2);
		assertVecAlmostEquals(result[0], [1, 2, 3]);
		assertVecAlmostEquals(result[1], [4, 5, 6]);
	},
});

Deno.test({
	name: "getVertexData() yielding Vec4",
	fn() {
		const buffer = new MeshAttributeBuffer({
			attributes: [{ offset: 0, format: Mesh.AttributeFormat.FLOAT32, componentCount: 4, attributeType: Mesh.AttributeType.POSITION }],
		});
		buffer.setVertexCount(2);
		buffer.setVertexData(Mesh.AttributeType.POSITION, [new Vec4(1, 2, 3, 4), new Vec4(5, 6, 7, 8)], false);

		const result = Array.from(buffer.getVertexData(Mesh.AttributeType.POSITION));

		assertEquals(result.length, 2);
		assertVecAlmostEquals(result[0], [1, 2, 3, 4]);
		assertVecAlmostEquals(result[1], [5, 6, 7, 8]);
	},
});

Deno.test({
	name: "getVertexData() yielding different AttributeFormats",
	fn() {
		const formats = [
			// Mesh.AttributeFormat.FLOAT16, (not yet supported)
			Mesh.AttributeFormat.FLOAT32,
			Mesh.AttributeFormat.INT8,
			Mesh.AttributeFormat.INT16,
			Mesh.AttributeFormat.INT32,
			// Mesh.AttributeFormat.NORM8, (not yet supported)
			// Mesh.AttributeFormat.NORM16, (not yet supported)
		];

		for (const format of formats) {
			const buffer = new MeshAttributeBuffer({
				attributes: [{ offset: 0, format, componentCount: 1, attributeType: Mesh.AttributeType.POSITION }],
			});
			buffer.setVertexCount(3);
			buffer.setVertexData(Mesh.AttributeType.POSITION, [1, 2, 3], false);

			const result = Array.from(buffer.getVertexData(Mesh.AttributeType.POSITION));

			assertEquals(result, [1, 2, 3]);
		}
	},
});
