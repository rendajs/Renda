import {assertEquals} from "std/testing/asserts";
import {Mesh} from "../../../../src/core/Mesh.js";
import {VertexState} from "../../../../src/rendering/VertexState.js";

Deno.test({
	name: "getDescriptor() with no buffers",
	fn() {
		const vertexState = new VertexState();

		const result = vertexState.getDescriptor();

		assertEquals(result, {
			buffers: [],
		});
	},
});

Deno.test({
	name: "getDescriptor() with some buffers",
	fn() {
		const vertexState = new VertexState({
			buffers: [
				{
					attributes: [
						{
							attributeType: Mesh.AttributeType.POSITION,
							componentCount: 3,
							format: Mesh.AttributeFormat.FLOAT32,
						},
					],
				},
				{
					attributes: [
						{
							attributeType: Mesh.AttributeType.NORMAL,
							componentCount: 3,
							format: Mesh.AttributeFormat.FLOAT32,
						},
					],
				},
			],
		});

		const result = vertexState.getDescriptor();

		assertEquals(result, {
			buffers: [
				{
					arrayStride: 12,
					attributes: [
						{
							format: "float32x3",
							offset: 0,
							shaderLocation: 0,
						},
					],
					stepMode: "vertex",
				},
				{
					arrayStride: 12,
					attributes: [
						{
							format: "float32x3",
							offset: 0,
							shaderLocation: 1,
						},
					],
					stepMode: "vertex",
				},
			],
		});
	},
});

Deno.test({
	name: "getDescriptor() with interleaved buffers",
	fn() {
		const vertexState = new VertexState({
			buffers: [
				{
					attributes: [
						{
							attributeType: Mesh.AttributeType.POSITION,
							componentCount: 3,
							format: Mesh.AttributeFormat.FLOAT32,
						},
						{
							attributeType: Mesh.AttributeType.NORMAL,
							componentCount: 3,
							format: Mesh.AttributeFormat.FLOAT32,
						},
					],
				},
			],
		});

		const result = vertexState.getDescriptor();

		assertEquals(result, {
			buffers: [
				{
					arrayStride: 24,
					attributes: [
						{
							format: "float32x3",
							offset: 0,
							shaderLocation: 0,
						},
						{
							format: "float32x3",
							offset: 12,
							shaderLocation: 1,
						},
					],
					stepMode: "vertex",
				},
			],
		});
	},
});

Deno.test({
	name: "getDescriptor() with forced array stride",
	fn() {
		const vertexState = new VertexState({
			buffers: [
				{
					attributes: [
						{
							attributeType: Mesh.AttributeType.POSITION,
							componentCount: 3,
							format: Mesh.AttributeFormat.FLOAT32,
						},
					],
				},
				{
					attributes: [
						{
							attributeType: Mesh.AttributeType.NORMAL,
							componentCount: 3,
							format: Mesh.AttributeFormat.FLOAT32,
						},
					],
					arrayStride: 12345,
				},
			],
		});

		const result = vertexState.getDescriptor();

		assertEquals(result, {
			buffers: [
				{
					arrayStride: 12,
					attributes: [
						{
							format: "float32x3",
							offset: 0,
							shaderLocation: 0,
						},
					],
					stepMode: "vertex",
				},
				{
					arrayStride: 12345,
					attributes: [
						{
							format: "float32x3",
							offset: 0,
							shaderLocation: 1,
						},
					],
					stepMode: "vertex",
				},
			],
		});
	},
});
