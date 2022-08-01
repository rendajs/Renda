import {assertEquals} from "std/testing/asserts.ts";
import {Mesh} from "../../../../src/core/Mesh.js";
import {VertexStateAttribute} from "../../../../src/rendering/VertexStateAttribute.js";

Deno.test({
	name: "getDescriptorFormat()",
	fn() {
		/** @type {[GPUVertexFormat, import("../../../../src/rendering/VertexStateAttribute.js").VertexStateAttributeOptions][]} */
		const tests = [
			["float16x2", {format: Mesh.AttributeFormat.FLOAT16, componentCount: 2}],
			["float16x4", {format: Mesh.AttributeFormat.FLOAT16, componentCount: 4}],
			["uint8x2", {format: Mesh.AttributeFormat.INT8, unsigned: true, componentCount: 2}],
			["uint8x4", {format: Mesh.AttributeFormat.INT8, unsigned: true, componentCount: 4}],
			["sint8x2", {format: Mesh.AttributeFormat.INT8, componentCount: 2}],
			["sint8x4", {format: Mesh.AttributeFormat.INT8, componentCount: 4}],
			["unorm8x2", {format: Mesh.AttributeFormat.NORM8, unsigned: true, componentCount: 2}],
			["unorm8x4", {format: Mesh.AttributeFormat.NORM8, unsigned: true, componentCount: 4}],
			["snorm8x2", {format: Mesh.AttributeFormat.NORM8, componentCount: 2}],
			["snorm8x4", {format: Mesh.AttributeFormat.NORM8, componentCount: 4}],
			["uint16x2", {format: Mesh.AttributeFormat.INT16, unsigned: true, componentCount: 2}],
			["uint16x4", {format: Mesh.AttributeFormat.INT16, unsigned: true, componentCount: 4}],
			["sint16x2", {format: Mesh.AttributeFormat.INT16, componentCount: 2}],
			["sint16x4", {format: Mesh.AttributeFormat.INT16, componentCount: 4}],
			["unorm16x2", {format: Mesh.AttributeFormat.NORM16, unsigned: true, componentCount: 2}],
			["unorm16x4", {format: Mesh.AttributeFormat.NORM16, unsigned: true, componentCount: 4}],
			["snorm16x2", {format: Mesh.AttributeFormat.NORM16, componentCount: 2}],
			["snorm16x4", {format: Mesh.AttributeFormat.NORM16, componentCount: 4}],
			["float16x2", {format: Mesh.AttributeFormat.FLOAT16, componentCount: 2}],
			["float16x4", {format: Mesh.AttributeFormat.FLOAT16, componentCount: 4}],
			["float32", {format: Mesh.AttributeFormat.FLOAT32, componentCount: 1}],
			["float32x2", {format: Mesh.AttributeFormat.FLOAT32, componentCount: 2}],
			["float32x3", {format: Mesh.AttributeFormat.FLOAT32, componentCount: 3}],
			["float32x4", {format: Mesh.AttributeFormat.FLOAT32, componentCount: 4}],
			["uint32", {format: Mesh.AttributeFormat.INT32, unsigned: true, componentCount: 1}],
			["uint32x2", {format: Mesh.AttributeFormat.INT32, unsigned: true, componentCount: 2}],
			["uint32x3", {format: Mesh.AttributeFormat.INT32, unsigned: true, componentCount: 3}],
			["uint32x4", {format: Mesh.AttributeFormat.INT32, unsigned: true, componentCount: 4}],
			["sint32", {format: Mesh.AttributeFormat.INT32, componentCount: 1}],
			["sint32x2", {format: Mesh.AttributeFormat.INT32, componentCount: 2}],
			["sint32x3", {format: Mesh.AttributeFormat.INT32, componentCount: 3}],
			["sint32x4", {format: Mesh.AttributeFormat.INT32, componentCount: 4}],
		];

		for (const [expected, options] of tests) {
			const attribute = new VertexStateAttribute(options);
			const result = attribute.getDescriptorFormat();
			assertEquals(result, expected);
		}
	},
});
