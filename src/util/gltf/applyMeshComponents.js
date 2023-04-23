import {Mesh} from "../../core/Mesh.js";
import {MeshComponent} from "../../components/builtIn/MeshComponent.js";
import {VertexState} from "../../rendering/VertexState.js";
import {BYTE, FLOAT, SHORT, UNSIGNED_BYTE, UNSIGNED_INT, UNSIGNED_SHORT} from "./constants.js";
import {getBufferViewBuffer} from "./getBuffer.js";

/**
 * @typedef {CreatedGltfMeshPrimitiveData[]} CreatedGltfMeshData
 */

/**
 * @typedef CreatedGltfMeshPrimitiveData
 * @property {Mesh} mesh
 * @property {import("../../rendering/Material.js").Material} material
 */

/**
 * Creates meshes and materials from glTF data and fills the provided entities with mesh components.
 * @param {import("./types.js").GltfJsonData} jsonData The full glTF data.
 * @param {Map<import("../../core/Entity.js").Entity, number>} entityNodeIds List of created entities and their corresponding node id in the glTF.
 * @param {object} options
 * @param {import("./getBuffer.js").GetBufferFn} options.getBufferFn
 * @param {import("./getMaterial.js").GetMaterialFn} options.getMaterialFn
 */
export async function applyMeshComponents(jsonData, entityNodeIds, {
	getBufferFn,
	getMaterialFn,
}) {
	// If no entities have been created, there are no meshes to create.
	if (entityNodeIds.size <= 0) return;

	if (!jsonData.nodes) {
		throw new Error("Assertion failed: nodes are referenced but the glTF data does not contain nodes.");
	}

	/**
	 * A map of created meshes and their gltf id, so that we can reuse them
	 * if the same mesh is referenced multiple times.
	 * @type {Map<number, CreatedGltfMeshData>}
	 */
	const createdMeshes = new Map();
	const meshDatas = jsonData.meshes || [];

	for (const [entity, nodeId] of entityNodeIds) {
		const nodeData = jsonData.nodes[nodeId];
		if (nodeData.mesh !== undefined) {
			const gltfMeshData = meshDatas[nodeData.mesh];
			if (!gltfMeshData) {
				throw new Error(`Tried to reference mesh with index ${nodeData.mesh} but it does not exist.`);
			}

			let createdMeshDatas = createdMeshes.get(nodeData.mesh);
			if (!createdMeshDatas) {
				createdMeshDatas = [];
				for (const primitive of gltfMeshData.primitives) {
					const createdMeshData = await createMeshFromGltfPrimitive(primitive, jsonData, getBufferFn, getMaterialFn);
					createdMeshDatas.push(createdMeshData);
				}
				createdMeshes.set(nodeData.mesh, createdMeshDatas);
			}

			for (const primitive of createdMeshDatas) {
				const component = entity.addComponent(MeshComponent);
				component.mesh = primitive.mesh;
				component.materials = [primitive.material];
			}
		}
	}
}

/**
 * @param {import("./types.js").GltfMeshPrimitiveData} gltfMesh
 * @param {import("./types.js").GltfJsonData} gltfJsonData
 * @param {import("./getBuffer.js").GetBufferFn} getBufferFn
 * @param {import("./getMaterial.js").GetMaterialFn} getMaterialFn
 */
async function createMeshFromGltfPrimitive(gltfMesh, gltfJsonData, getBufferFn, getMaterialFn) {
	/** @type {import("../../rendering/VertexStateBuffer.js").VertexStateBufferOptions[]} */
	const vertexStateBuffers = [];

	/** @type {Map<number, ArrayBuffer>} */
	const meshBuffers = new Map();

	let vertexCount = 0;
	let vertexCountSet = false;
	for (const [attributeName, accessorIndex] of Object.entries(gltfMesh.attributes)) {
		const {accessorData, attributeType, format, unsigned, componentCount, buffer} = await getVertexAccessorData(gltfJsonData, accessorIndex, attributeName, getBufferFn);

		if (!vertexCountSet) {
			vertexCount = accessorData.count;
			vertexCountSet = true;
		} else if (vertexCount !== accessorData.count) {
			throw new Error("All accessors must have the same count.");
		}

		if (attributeType === undefined) {
			throw new Error("Assertion failed, attribute type is undefined.");
		}

		vertexStateBuffers.push({
			attributes: [
				{
					attributeType,
					format,
					componentCount,
					unsigned,
				},
			],
		});

		meshBuffers.set(attributeType, buffer);
	}

	let indicesBuffer;
	let indexFormat = Mesh.IndexFormat.NONE;
	if (gltfMesh.indices) {
		const {buffer, format} = await getIndexAccessorData(gltfJsonData, gltfMesh.indices, getBufferFn);
		indicesBuffer = buffer;
		indexFormat = format;
	}

	const vertexState = new VertexState({
		buffers: vertexStateBuffers,
	});
	const mesh = new Mesh();
	mesh.setVertexState(vertexState);
	mesh.setVertexCount(vertexCount);
	if (indicesBuffer) {
		mesh.setIndexFormat(indexFormat);
		mesh.setIndexData(indicesBuffer);
	}

	for (const [attributeType, buffer] of meshBuffers) {
		mesh.setVertexData(attributeType, buffer);
	}

	const material = await getMaterialFn(gltfMesh.material);

	return {mesh, material};
}

/**
 * @param {import("./types.js").GltfJsonData} gltfJsonData
 * @param {number} accessorIndex
 */
function getAccessorData(gltfJsonData, accessorIndex) {
	const accessorDatas = gltfJsonData.accessors || [];
	const accessorData = accessorDatas[accessorIndex];
	if (!accessorData) {
		throw new Error(`Failed to get accessor with index ${accessorIndex} because it does not exist.`);
	}
	return accessorData;
}

/**
 * @param {import("./types.js").GltfJsonData} gltfJsonData
 * @param {number} accessorIndex
 * @param {string} attributeName
 * @param {import("./getBuffer.js").GetBufferFn} getBufferFn
 */
async function getVertexAccessorData(gltfJsonData, accessorIndex, attributeName, getBufferFn) {
	const accessorData = getAccessorData(gltfJsonData, accessorIndex);

	if (accessorData.componentType == UNSIGNED_INT) {
		throw new Error("Accessor component type UNSIGNED_INT is only allowed for index buffers.");
	}

	if (accessorData.bufferView === undefined) {
		// TODO: According to the spec, we should create an array buffer with all zeros.
		throw new Error("not yet implemented");
	} else {
		let attributeType;
		let format;
		let unsigned;
		let componentCount;

		switch (attributeName) {
			case "POSITION":
				attributeType = Mesh.AttributeType.POSITION;
				break;
			case "NORMAL":
				attributeType = Mesh.AttributeType.NORMAL;
				break;
			case "TANGENT":
				attributeType = Mesh.AttributeType.TANGENT;
				break;
			case "TEXCOORD_0":
				attributeType = Mesh.AttributeType.UV1;
				break;
			case "TEXCOORD_1":
				attributeType = Mesh.AttributeType.UV2;
				break;
			case "COLOR_0":
				attributeType = Mesh.AttributeType.COLOR;
				break;
			default:
				throw new Error(`Unknown attribute type: ${attributeName}`);
		}

		switch (accessorData.componentType) {
			case BYTE:
				format = Mesh.AttributeFormat.INT8;
				unsigned = false;
				break;
			case UNSIGNED_BYTE:
				format = Mesh.AttributeFormat.INT8;
				unsigned = true;
				break;
			case SHORT:
				format = Mesh.AttributeFormat.INT16;
				unsigned = false;
				break;
			case UNSIGNED_SHORT:
				format = Mesh.AttributeFormat.INT16;
				unsigned = true;
				break;
			case UNSIGNED_INT:
				format = Mesh.AttributeFormat.INT32;
				unsigned = true;
				break;
			case FLOAT:
				format = Mesh.AttributeFormat.FLOAT32;
				unsigned = false;
				break;
			default:
				throw new Error(`Unsupported component type ${accessorData.componentType}`);
		}

		switch (accessorData.type) {
			case "SCALAR":
				componentCount = 1;
				break;
			case "VEC2":
				componentCount = 2;
				break;
			case "VEC3":
				componentCount = 3;
				break;
			case "VEC4":
				componentCount = 4;
				break;
			case "MAT2":
				componentCount = 4;
				break;
			case "MAT3":
				componentCount = 9;
				break;
			case "MAT4":
				componentCount = 16;
				break;
			default:
				throw new Error(`Unsupported accessor type ${accessorData.type}`);
		}

		const accessorByteOffset = accessorData.byteOffset || 0;
		const buffer = await getBufferViewBuffer(gltfJsonData, accessorData.bufferView, getBufferFn, accessorByteOffset);

		return {
			accessorData,
			attributeType,
			format,
			unsigned,
			componentCount,
			buffer,
		};
	}
}

/**
 * @param {import("./types.js").GltfJsonData} gltfJsonData
 * @param {number} accessorIndex
 * @param {import("./getBuffer.js").GetBufferFn} getBufferFn
 */
async function getIndexAccessorData(gltfJsonData, accessorIndex, getBufferFn) {
	const accessorData = getAccessorData(gltfJsonData, accessorIndex);

	if (accessorData.type != "SCALAR") {
		throw new Error("Accessor type must be SCALAR for index buffers.");
	}

	if (accessorData.bufferView === undefined) {
		// TODO: According to the spec, we should create an array buffer with all zeros.
		throw new Error("not yet implemented");
	} else {
		/** @type {import("../../core/Mesh.js").IndexFormat} */
		let format = Mesh.IndexFormat.NONE;
		switch (accessorData.componentType) {
			case UNSIGNED_SHORT:
				format = Mesh.IndexFormat.UINT_16;
				break;
			case UNSIGNED_INT:
				format = Mesh.IndexFormat.UINT_32;
				break;
			default:
				throw new Error("Index buffers must have an unsigned integer component type.");
		}

		const accessorByteOffset = accessorData.byteOffset || 0;
		const buffer = await getBufferViewBuffer(gltfJsonData, accessorData.bufferView, getBufferFn, accessorByteOffset);

		return {
			buffer,
			format,
		};
	}
}
