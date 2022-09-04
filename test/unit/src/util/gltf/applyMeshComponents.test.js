import {assertExists, assertRejects} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls, spy} from "std/testing/mock.ts";
import {Entity, Material, MeshComponent} from "../../../../../src/mod.js";
import {applyMeshComponents} from "../../../../../src/util/gltf/applyMeshComponents.js";
import {FLOAT, UNSIGNED_INT} from "../../../../../src/util/gltf/constants.js";

/**
 * @param {object} options
 * @param {number} [options.indicesAccessorComponentType]
 * @param {import("../../../../../src/util/gltf/types.js").GltfAccessorType} [options.indicesAccessorType]
 */
function basicSetup({
	indicesAccessorComponentType = UNSIGNED_INT,
	indicesAccessorType = "SCALAR",
} = {}) {
	/** @type {Map<Entity, number>} */
	const entityNodeIds = new Map();
	const entity = new Entity();
	entityNodeIds.set(entity, 0);

	const getBufferFn = async () => {
		return new ArrayBuffer(0);
	};

	/** @type {import("../../../../../src/util/gltf/getMaterial.js").GetMaterialFn} */
	const getMaterialFn = async () => {
		return new Material();
	};

	/** @type {import("../../../../../src/util/gltf/types.js").GltfJsonData} */
	const basicGltfJsonData = {
		asset: {version: "2.0"},
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
				count: 10,
				bufferView: 0,
			},
			{
				type: "VEC2",
				componentType: FLOAT,
				count: 10,
				bufferView: 1,
			},
			{
				type: "VEC2",
				componentType: FLOAT,
				count: 10,
				bufferView: 2,
			},
			{
				type: "VEC4",
				componentType: FLOAT,
				count: 10,
				bufferView: 3,
			},
			{
				type: indicesAccessorType,
				componentType: indicesAccessorComponentType,
				count: 10,
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

	return {
		entityNodeIds,
		entity,
		basicGltfJsonData,
		getBufferFn,
		getMaterialFn,
	};
}

Deno.test({
	name: "Basic mesh",
	async fn() {
		const {entityNodeIds, entity, basicGltfJsonData, getBufferFn, getMaterialFn} = basicSetup();
		await applyMeshComponents(basicGltfJsonData, entityNodeIds, {getBufferFn, getMaterialFn});

		const meshComponent = entity.getComponent(MeshComponent);
		assertExists(meshComponent);

		// TODO: assert that the created mesh has the correct data
	},
});

Deno.test({
	name: "Nonexistent mesh throws",
	async fn() {
		const {entityNodeIds, getBufferFn, getMaterialFn} = basicSetup();
		await assertRejects(async () => {
			await applyMeshComponents({
				asset: {version: "2.0"},
				nodes: [
					{
						mesh: 123,
					},
				],
			}, entityNodeIds, {getBufferFn, getMaterialFn});
		}, Error, "Tried to reference mesh with index 123 but it does not exist.");
	},
});

Deno.test({
	name: "Nonexistent accessor throws",
	async fn() {
		const {entityNodeIds, getBufferFn, getMaterialFn} = basicSetup();
		await assertRejects(async () => {
			await applyMeshComponents({
				asset: {version: "2.0"},
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
			}, entityNodeIds, {getBufferFn, getMaterialFn});
		}, Error, "Failed to get accessor with index 123 because it does not exist.");
	},
});

Deno.test({
	name: "Nonexistent bufferview throws",
	async fn() {
		const {entityNodeIds, getBufferFn, getMaterialFn} = basicSetup();
		await assertRejects(async () => {
			await applyMeshComponents({
				asset: {version: "2.0"},
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
						bufferView: 123,
					},
				],
			}, entityNodeIds, {getBufferFn, getMaterialFn});
		}, Error, "Tried to reference buffer view with index 123 but it does not exist.");
	},
});

Deno.test({
	name: "Accessors with different counts throws",
	async fn() {
		const {entityNodeIds, getBufferFn, getMaterialFn} = basicSetup();
		await assertRejects(async () => {
			await applyMeshComponents({
				asset: {version: "2.0"},
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
			}, entityNodeIds, {getBufferFn, getMaterialFn});
		}, Error, "All accessors must have the same count.");
	},
});

Deno.test({
	name: "Indices accessor with non unsigned integer throws",
	async fn() {
		const {entityNodeIds, basicGltfJsonData, getBufferFn, getMaterialFn} = basicSetup({
			indicesAccessorComponentType: FLOAT,
		});

		await assertRejects(async () => {
			await applyMeshComponents(basicGltfJsonData, entityNodeIds, {getBufferFn, getMaterialFn});
		}, Error, "Index buffers must have an unsigned integer component type.");
	},
});

Deno.test({
	name: "Indices accessor with non unsigned integer throws",
	async fn() {
		const {entityNodeIds, basicGltfJsonData, getBufferFn, getMaterialFn} = basicSetup({
			indicesAccessorType: "VEC3",
		});

		await assertRejects(async () => {
			await applyMeshComponents(basicGltfJsonData, entityNodeIds, {getBufferFn, getMaterialFn});
		}, Error, "Accessor type must be SCALAR for index buffers.");
	},
});

Deno.test({
	name: "gets materials with the correct indices",
	async fn() {
		const {entityNodeIds, basicGltfJsonData, getBufferFn, getMaterialFn} = basicSetup();

		const getMaterialFnSpy = spy(getMaterialFn);

		await applyMeshComponents(basicGltfJsonData, entityNodeIds, {getBufferFn, getMaterialFn: getMaterialFnSpy});

		assertSpyCalls(getMaterialFnSpy, 1);
		assertSpyCall(getMaterialFnSpy, 0, {
			args: [undefined],
		});
	},
});
