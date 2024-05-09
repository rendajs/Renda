import { assertEquals } from "std/testing/asserts.ts";
import { InternalMeshAttributeBuffer } from "../../../../src/core/InternalMeshAttributeBuffer.js";
import { MeshAttributeBuffer } from "../../../../src/core/MeshAttributeBuffer.js";
import { Mesh } from "../../../../src/mod.js";

Deno.test({
	name: "Passes calls through to the internal mesh attribute buffer",
	fn() {
		const internalBuffer = new InternalMeshAttributeBuffer({
			isUnused: false,
			attributeSettings: [
				{
					attributeType: Mesh.AttributeType.POSITION,
					componentCount: 3,
					format: Mesh.AttributeFormat.FLOAT32,
					offset: 0,
				},
			],
		});
		internalBuffer.setVertexCount(1);
		const buffer = new MeshAttributeBuffer(internalBuffer);

		assertEquals(buffer.buffer.byteLength, 12);
		assertEquals(buffer.isUnused, false);
		assertEquals(buffer.attributeSettings, [
			{
				attributeType: Mesh.AttributeType.POSITION,
				componentCount: 3,
				format: Mesh.AttributeFormat.FLOAT32,
				offset: 0,
			},
		]);
		assertEquals(buffer.arrayStride, 12);

		let onBufferChangedCallCount = 0;
		const onChange = () => {
			onBufferChangedCallCount++;
		};
		buffer.onBufferChanged(onChange);

		internalBuffer.setVertexCount(2);
		assertEquals(onBufferChangedCallCount, 1);

		internalBuffer.setVertexCount(42);
		assertEquals(onBufferChangedCallCount, 2);

		buffer.removeOnBufferChanged(onChange);

		internalBuffer.setVertexCount(123);
		assertEquals(onBufferChangedCallCount, 2);
	},
});
