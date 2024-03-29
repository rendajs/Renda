import { assertEquals, assertNotStrictEquals, assertStrictEquals } from "std/testing/asserts.ts";
import { Mesh } from "../../../../../src/mod.js";
import { InternalMeshAttributeBuffer } from "../../../../../src/core/InternalMeshAttributeBuffer.js";

Deno.test({
	name: "clone is not the same reference",
	fn() {
		const buffer = new InternalMeshAttributeBuffer({});

		const clone = buffer.clone();
		assertNotStrictEquals(buffer, clone);
	},
});

Deno.test({
	name: "isUnused flag is copied",
	fn() {
		const buffer1 = new InternalMeshAttributeBuffer({
			isUnused: true,
			attributeSettings: [
				{
					attributeType: Mesh.AttributeType.POSITION,
					componentCount: 3,
					format: Mesh.AttributeFormat.FLOAT16,
					offset: 0,
				},
			],
		});

		const clone1 = buffer1.clone();
		assertStrictEquals(clone1.isUnused, true);

		const buffer2 = new InternalMeshAttributeBuffer({
			isUnused: false,
		});

		const clone2 = buffer2.clone();
		assertStrictEquals(clone2.isUnused, false);
	},
});

Deno.test({
	name: "isUnused flag is copied",
	fn() {
		const buffer1 = new InternalMeshAttributeBuffer({
			isUnused: true,
			attributeSettings: [
				{
					attributeType: Mesh.AttributeType.POSITION,
					componentCount: 3,
					format: Mesh.AttributeFormat.FLOAT16,
					offset: 0,
				},
			],
		});

		const clone1 = buffer1.clone();
		assertStrictEquals(clone1.isUnused, true);

		const buffer2 = new InternalMeshAttributeBuffer({
			isUnused: false,
		});

		const clone2 = buffer2.clone();
		assertStrictEquals(clone2.isUnused, false);
	},
});

Deno.test({
	name: "arrayStride is copied",
	fn() {
		const buffer = new InternalMeshAttributeBuffer({
			arrayStride: 2,
		});

		const clone = buffer.clone();
		assertEquals(clone.arrayStride, 2);

		// Change the arraystride to verify it isn't changed on the clone
		buffer.setArrayStride(4);
		assertEquals(buffer.arrayStride, 4);
		assertEquals(clone.arrayStride, 2);
	},
});

Deno.test({
	name: "attribute data is cloned",
	fn() {
		const buffer = new InternalMeshAttributeBuffer({
			attributeSettings: [
				{
					attributeType: Mesh.AttributeType.POSITION,
					componentCount: 3,
					format: Mesh.AttributeFormat.FLOAT16,
					offset: 0,
				},
				{
					attributeType: Mesh.AttributeType.NORMAL,
					componentCount: 3,
					format: Mesh.AttributeFormat.FLOAT16,
					offset: 0,
				},
			],
		});

		const clone = buffer.clone();
		assertEquals(buffer.attributeSettings, clone.attributeSettings);
	},
});
