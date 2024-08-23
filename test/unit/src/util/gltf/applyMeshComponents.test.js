import { assertEquals, assertExists, assertRejects } from "std/testing/asserts.ts";
import { assertSpyCall, assertSpyCalls, spy, stub } from "std/testing/mock.ts";
import { Entity, Material, Mesh, MeshComponent } from "../../../../../src/mod.js";
import { applyMeshComponents } from "../../../../../src/util/gltf/applyMeshComponents.js";
import { FLOAT, UNSIGNED_INT, UNSIGNED_SHORT } from "../../../../../src/util/gltf/constants.js";
import { createMockParsingContext } from "./shared.js";

/**
 * @param {object} options
 * @param {number} [options.indicesAccessorComponentType]
 * @param {import("../../../../../src/util/gltf/gltfParsing.js").GltfAccessorType} [options.indicesAccessorType]
 */
function basicSetup({
	indicesAccessorComponentType = UNSIGNED_INT,
	indicesAccessorType = "SCALAR",
} = {}) {
	/** @type {Map<Entity, number>} */
	const entityNodeIds = new Map();
	const entity = new Entity();
	entityNodeIds.set(entity, 0);

	/** @type {import("../../../../../src/util/gltf/getMaterial.js").GetMaterialFn} */
	const getMaterialFn = async () => {
		return new Material();
	};

	/** @type {import("../../../../../src/util/gltf/gltfParsing.js").GltfJsonData} */
	const basicGltfJsonData = {
		asset: { version: "2.0" },
		nodes: [
			{
				mesh: 0,
			},
		],
		meshes: [
			{
				primitives: [
					{
						attributes: {
							POSITION: 0,
							TEXCOORD_0: 1,
							TEXCOORD_1: 2,
							COLOR_0: 3,
						},
						indices: 4,
					},
				],
			},
		],
		accessors: [
			{
				type: "VEC3",
				componentType: FLOAT,
				count: 3,
				bufferView: 0,
			},
			{
				type: "VEC2",
				componentType: FLOAT,
				count: 3,
				bufferView: 1,
			},
			{
				type: "VEC2",
				componentType: FLOAT,
				count: 3,
				bufferView: 2,
			},
			{
				type: "VEC4",
				componentType: FLOAT,
				count: 3,
				bufferView: 3,
			},
			{
				type: indicesAccessorType,
				componentType: indicesAccessorComponentType,
				count: 3,
				bufferView: 4,
			},
		],
		bufferViews: [
			{
				byteLength: 10,
				buffer: 0,
			},
			{
				byteLength: 10,
				buffer: 0,
			},
			{
				byteLength: 10,
				buffer: 0,
			},
			{
				byteLength: 10,
				buffer: 0,
			},
			{
				byteLength: 10,
				buffer: 0,
			},
		],
	};

	const parsingContext = createMockParsingContext();

	return {
		entityNodeIds,
		entity,
		basicGltfJsonData,
		parsingContext,
		getMaterialFn,
	};
}

Deno.test({
	name: "Basic mesh",
	async fn() {
		const { entityNodeIds, entity, basicGltfJsonData, parsingContext, getMaterialFn } = basicSetup();

		stub(parsingContext, "getBufferView", async (bufferViewIndex) => {
			if (bufferViewIndex == 0) { // position attribute
				return new Float32Array([0, 0, 0, 1, 1, 1, 2, 2, 2]);
			} else if (bufferViewIndex == 4) { // Indices buffer
				return new Uint32Array([0, 1, 2]).buffer;
			} else {
				return new ArrayBuffer(0);
			}
		});

		await applyMeshComponents(basicGltfJsonData, entityNodeIds, parsingContext, { getMaterialFn });

		const mesh = entity.getComponent(MeshComponent)?.mesh;
		assertExists(mesh);

		assertEquals(mesh.indexFormat, Mesh.IndexFormat.UINT_32);
		assertEquals(mesh.indexCount, 3);
		assertEquals(Array.from(new Uint32Array(mesh.indexBuffer)), [0, 1, 2]);

		const attributeBuffer = mesh.getAttributeBufferForType(Mesh.AttributeType.POSITION);
		assertExists(attributeBuffer);

		assertEquals(Array.from(new Float32Array(attributeBuffer.buffer)), [0, 0, 0, 1, 1, 1, 2, 2, 2]);
	},
});

Deno.test({
	name: "Nonexistent mesh throws",
	async fn() {
		const { entityNodeIds, parsingContext, getMaterialFn } = basicSetup();
		await assertRejects(async () => {
			await applyMeshComponents({
				asset: { version: "2.0" },
				nodes: [
					{
						mesh: 123,
					},
				],
			}, entityNodeIds, parsingContext, { getMaterialFn });
		}, Error, "Tried to reference mesh with index 123 but it does not exist.");
	},
});

Deno.test({
	name: "Nonexistent accessor throws",
	async fn() {
		const { entityNodeIds, parsingContext, getMaterialFn } = basicSetup();
		await assertRejects(async () => {
			await applyMeshComponents({
				asset: { version: "2.0" },
				nodes: [
					{
						mesh: 0,
					},
				],
				meshes: [
					{
						primitives: [
							{
								attributes: {
									POSITION: 123,
								},
							},
						],
					},
				],
			}, entityNodeIds, parsingContext, { getMaterialFn });
		}, Error, "Failed to get accessor with index 123 because it does not exist.");
	},
});

Deno.test({
	name: "Accessors with different counts throws",
	async fn() {
		const { entityNodeIds, parsingContext, getMaterialFn } = basicSetup();
		await assertRejects(async () => {
			await applyMeshComponents({
				asset: { version: "2.0" },
				nodes: [
					{
						mesh: 0,
					},
				],
				meshes: [
					{
						primitives: [
							{
								attributes: {
									POSITION: 0,
									NORMAL: 1,
								},
							},
						],
					},
				],
				accessors: [
					{
						type: "VEC3",
						componentType: FLOAT,
						count: 10,
						bufferView: 0,
					},
					{
						type: "VEC3",
						componentType: FLOAT,
						count: 20,
						bufferView: 1,
					},
				],
				bufferViews: [
					{
						byteLength: 10,
						buffer: 0,
					},
					{
						byteLength: 20,
						buffer: 1,
					},
				],
			}, entityNodeIds, parsingContext, { getMaterialFn });
		}, Error, "All accessors must have the same count.");
	},
});

Deno.test({
	name: "Indices accessor with non unsigned integer throws",
	async fn() {
		const { entityNodeIds, basicGltfJsonData, parsingContext, getMaterialFn } = basicSetup({
			indicesAccessorComponentType: FLOAT,
		});

		await assertRejects(async () => {
			await applyMeshComponents(basicGltfJsonData, entityNodeIds, parsingContext, { getMaterialFn });
		}, Error, "Index buffers must have an unsigned integer component type.");
	},
});

Deno.test({
	name: "Indices accessor with non unsigned integer throws",
	async fn() {
		const { entityNodeIds, basicGltfJsonData, parsingContext, getMaterialFn } = basicSetup({
			indicesAccessorType: "VEC3",
		});

		await assertRejects(async () => {
			await applyMeshComponents(basicGltfJsonData, entityNodeIds, parsingContext, { getMaterialFn });
		}, Error, "Accessor type must be SCALAR for index buffers.");
	},
});

Deno.test({
	name: "gets materials with the correct indices",
	async fn() {
		const { entityNodeIds, basicGltfJsonData, parsingContext, getMaterialFn } = basicSetup();

		const getMaterialFnSpy = spy(getMaterialFn);

		await applyMeshComponents(basicGltfJsonData, entityNodeIds, parsingContext, { getMaterialFn: getMaterialFnSpy });

		assertSpyCalls(getMaterialFnSpy, 1);
		assertSpyCall(getMaterialFnSpy, 0, {
			args: [undefined],
		});
	},
});

Deno.test({
	name: "When an accessor has no bufferView, an empty buffer is created",
	async fn() {
		const { entity, entityNodeIds, parsingContext, getMaterialFn } = basicSetup();
		await applyMeshComponents({
			asset: { version: "2.0" },
			nodes: [
				{
					mesh: 0,
				},
			],
			meshes: [
				{
					primitives: [
						{
							indices: 0,
							attributes: {
								POSITION: 1,
								TEXCOORD_0: 2,
							},
						},
					],
				},
			],
			accessors: [
				{
					type: "SCALAR",
					componentType: UNSIGNED_INT,
					count: 10,
				},
				{
					type: "VEC3",
					componentType: FLOAT,
					count: 20,
				},
				{
					type: "VEC2",
					componentType: UNSIGNED_SHORT,
					count: 20,
				},
			],
		}, entityNodeIds, parsingContext, { getMaterialFn });

		const meshComponent = entity.getComponent(MeshComponent);
		assertExists(meshComponent?.mesh);
		assertEquals(meshComponent.mesh.indexCount, 10);
		const attributeBuffers = Array.from(meshComponent.mesh.getAttributeBuffers());
		assertEquals(attributeBuffers.length, 2);
		assertEquals(attributeBuffers[0].buffer.byteLength, 240);
		assertEquals(attributeBuffers[1].buffer.byteLength, 80);
	},
});

Deno.test({
	name: "extension hooks are called and applied",
	async fn() {
		const { entity, entityNodeIds, basicGltfJsonData, parsingContext, getMaterialFn } = basicSetup();

		/** @type {import("../../../../../src/util/gltf/gltfParsing.js").GltfExtension} */
		const extension = {
			name: "TEST_extension",
			handlePrimitive(primitive, parsingContext, primitiveContext) {
				primitiveContext.setIndexBuffer(Mesh.IndexFormat.UINT_16, new Uint16Array([0, 1, 2]).buffer);
				primitiveContext.setAttributeBuffer(Mesh.AttributeType.POSITION, new Float32Array([0, 0, 0, 1, 1, 1, 2, 2, 2]).buffer);
			},
		};
		const handlePrimitiveSpy = spy(extension, "handlePrimitive");
		parsingContext.extensions = [extension];

		await applyMeshComponents(basicGltfJsonData, entityNodeIds, parsingContext, { getMaterialFn });

		assertSpyCalls(handlePrimitiveSpy, 1);

		const mesh = entity.getComponent(MeshComponent)?.mesh;
		assertExists(mesh);

		assertEquals(mesh.indexFormat, Mesh.IndexFormat.UINT_16);
		assertEquals(mesh.indexCount, 3);
		assertEquals(Array.from(new Uint16Array(mesh.indexBuffer)), [0, 1, 2]);

		const attributeBuffer = mesh.getAttributeBufferForType(Mesh.AttributeType.POSITION);
		assertExists(attributeBuffer);

		assertEquals(Array.from(new Float32Array(attributeBuffer.buffer)), [0, 0, 0, 1, 1, 1, 2, 2, 2]);
	},
});
