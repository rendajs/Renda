import { assertEquals, assertExists, assertThrows } from "std/testing/asserts.ts";
import { Mesh } from "../../../../src/core/Mesh.js";
import { VertexState } from "../../../../src/rendering/VertexState.js";

function getBasicVertexStateOptions() {
	/** @type {import("../../../../src/rendering/VertexState.js").VertexStateOptions} */
	const options = {
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
	};
	return options;
}

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
		const vertexState = new VertexState(getBasicVertexStateOptions());

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
		const options = getBasicVertexStateOptions();
		assertExists(options.buffers);
		options.buffers[1].arrayStride = 12345;
		const vertexState = new VertexState(options);

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

Deno.test({
	name: "getDescriptor() with forced shader location",
	fn() {
		const options = getBasicVertexStateOptions();
		assertExists(options.buffers);
		assertExists(options.buffers[0].attributes);
		options.buffers[0].attributes[0].shaderLocation = 123;
		assertExists(options.buffers[1].attributes);
		options.buffers[1].attributes[0].shaderLocation = 456;
		const vertexState = new VertexState(options);

		const result = vertexState.getDescriptor();

		assertEquals(result, {
			buffers: [
				{
					arrayStride: 12,
					attributes: [
						{
							format: "float32x3",
							offset: 0,
							shaderLocation: 123,
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
							shaderLocation: 456,
						},
					],
					stepMode: "vertex",
				},
			],
		});
	},
});

Deno.test({
	name: "getDescriptor() with shader location helpers",
	fn() {
		const options = getBasicVertexStateOptions();
		const vertexState = new VertexState(options);

		const result = vertexState.getDescriptor({
			preferredShaderLocations: [
				{ attributeType: Mesh.AttributeType.POSITION, location: 123 },
				{ attributeType: Mesh.AttributeType.NORMAL, location: 456 },
			],
		});

		assertEquals(result, {
			buffers: [
				{
					arrayStride: 12,
					attributes: [
						{
							format: "float32x3",
							offset: 0,
							shaderLocation: 123,
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
							shaderLocation: 456,
						},
					],
					stepMode: "vertex",
				},
			],
		});
	},
});

Deno.test({
	name: "getDescriptor() uses the first available shader location for automatic shader location attributes",
	fn() {
		const vertexState = new VertexState({
			buffers: [
				{
					attributes: [
						{
							attributeType: Mesh.AttributeType.POSITION,
							componentCount: 1,
							shaderLocation: null, // auto: 0
						},
						{
							attributeType: Mesh.AttributeType.NORMAL,
							componentCount: 2,
							shaderLocation: 1,
						},
						{
							attributeType: Mesh.AttributeType.TANGENT,
							componentCount: 3,
							shaderLocation: -1, // auto, set with getDescriptorArguments() to 3
						},
						{
							attributeType: Mesh.AttributeType.COLOR,
							componentCount: 4,
							shaderLocation: "auto", // auto, 2 is the only left over
						},
						{
							attributeType: Mesh.AttributeType.UV1,
							format: Mesh.AttributeFormat.FLOAT16,
							componentCount: 2,
							// auto shader location, 4 is the only left over
						},
					],
				},
			],
		});

		const result = vertexState.getDescriptor({
			preferredShaderLocations: [{ attributeType: Mesh.AttributeType.TANGENT, location: 3 }],
		});

		assertEquals(result, {
			buffers: [
				{
					arrayStride: 44,
					attributes: [
						{
							format: "float32",
							offset: 0,
							shaderLocation: 0,
						},
						{
							format: "float32x2",
							offset: 4,
							shaderLocation: 1,
						},
						{
							format: "float32x3",
							offset: 12,
							shaderLocation: 3,
						},
						{
							format: "float32x4",
							offset: 24,
							shaderLocation: 2,
						},
						{
							format: "float16x2",
							offset: 40,
							shaderLocation: 4,
						},
					],
					stepMode: "vertex",
				},
			],
		});
	},
});

Deno.test({
	name: "getDescriptor() with duplicate preferredShaderLocations attributes throws",
	fn() {
		const vertexState = new VertexState();
		assertThrows(() => {
			vertexState.getDescriptor({
				preferredShaderLocations: [
					{ attributeType: Mesh.AttributeType.POSITION, location: 123 },
					{ attributeType: Mesh.AttributeType.POSITION, location: 456 },
				],
			});
		}, Error, "Preferred shader location for attribute type 0 is mapped to multiple locations.");
	},
});

Deno.test({
	name: "getDescriptor() with preferredShaderLocations taken by the vertexstate throws",
	fn() {
		const options = getBasicVertexStateOptions();
		assertExists(options.buffers);
		assertExists(options.buffers[1].attributes);
		options.buffers[1].attributes[0].shaderLocation = 123;
		const vertexState = new VertexState(options);
		assertThrows(() => {
			vertexState.getDescriptor({
				preferredShaderLocations: [{ attributeType: Mesh.AttributeType.POSITION, location: 123 }],
			});
		}, Error, "Preferred shader location 123 is already taken by an attribute in the VertexState.");
	},
});
