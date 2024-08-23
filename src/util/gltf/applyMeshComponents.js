import { Mesh } from "../../core/Mesh.js";
import { MeshComponent } from "../../components/builtIn/MeshComponent.js";
import { VertexState } from "../../rendering/VertexState.js";
import { BYTE, FLOAT, SHORT, UNSIGNED_BYTE, UNSIGNED_INT, UNSIGNED_SHORT } from "./constants.js";

/**
 * @typedef {CreatedGltfMeshPrimitiveData[]} CreatedGltfMeshData
 */

/**
 * @typedef CreatedGltfMeshPrimitiveData
 * @property {Mesh} mesh
 * @property {import("../../rendering/Material.js").Material} material
 */

/**
 * @typedef GltfPrimitiveParsingContextIndexAccessorData
 * @property {number} format
 * @property {import("./gltfParsing.js").GltfAccessorData} accessorData
 */

/**
 * Creates meshes and materials from glTF data and fills the provided entities with mesh components.
 * @param {import("./gltfParsing.js").GltfJsonData} jsonData The full glTF data.
 * @param {Map<import("../../core/Entity.js").Entity, number>} entityNodeIds List of created entities and their corresponding node id in the glTF.
 * @param {import("./gltfParsing.js").GltfParsingContext} parsingContext
 * @param {object} options
 * @param {import("./getMaterial.js").GetMaterialFn} options.getMaterialFn
 */
export async function applyMeshComponents(jsonData, entityNodeIds, parsingContext, {
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
					const createdMeshData = await createMeshFromGltfPrimitive(primitive, jsonData, parsingContext, getMaterialFn);
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
 * @param {import("./gltfParsing.js").GltfMeshPrimitiveData} gltfPrimitive
 * @param {import("./gltfParsing.js").GltfJsonData} gltfJsonData
 * @param {import("./gltfParsing.js").GltfParsingContext} parsingContext
 * @param {import("./getMaterial.js").GetMaterialFn} getMaterialFn
 */
async function createMeshFromGltfPrimitive(gltfPrimitive, gltfJsonData, parsingContext, getMaterialFn) {
	/** @type {import("../../rendering/VertexStateBuffer.js").VertexStateBufferOptions[]} */
	const vertexStateBuffers = [];

	/** @type {Map<number, ArrayBuffer>} */
	const meshBuffers = new Map();

	/** @type {Map<number, ArrayBuffer>} */
	const extensionAttributes = new Map();
	let extensionIndexBuffer = /** @type {{buffer: ArrayBuffer, format: number}?} */ (null);

	let indexAccessorData = null;
	if (gltfPrimitive.indices != undefined) {
		indexAccessorData = await getIndexAccessorData(gltfJsonData, gltfPrimitive.indices);
	}

	/** @type {import("./gltfParsing.js").GltfPrimitiveParsingContext} */
	const primitiveParsingContext = {
		getIndexAccessorData() {
			return indexAccessorData;
		},
		setAttributeBuffer(attributeType, buffer) {
			extensionAttributes.set(attributeType, buffer);
		},
		setIndexBuffer(format, buffer) {
			extensionIndexBuffer = { buffer, format };
		},
	};

	for (const extension of parsingContext.extensions) {
		if (extension.handlePrimitive) {
			await extension.handlePrimitive(gltfPrimitive, parsingContext, primitiveParsingContext);
		}
	}

	/** @type {ArrayBuffer?} */
	let indicesBuffer = null;
	let indexFormat = Mesh.IndexFormat.NONE;
	if (indexAccessorData) {
		const { format, accessorData } = indexAccessorData;
		indexFormat = format;
		if (extensionIndexBuffer) {
			indicesBuffer = extensionIndexBuffer.buffer;
			indexFormat = extensionIndexBuffer.format;
		} else if (accessorData.bufferView != undefined) {
			indicesBuffer = await parsingContext.getBufferView(accessorData.bufferView, accessorData.byteOffset);
		} else {
			// According to the spec, we should create an empty buffer with all zeros.
			let bytesPerComponent;
			switch (accessorData.componentType) {
				case UNSIGNED_SHORT:
					bytesPerComponent = 2;
					break;
				case UNSIGNED_INT:
					bytesPerComponent = 4;
					break;
				default:
					throw new Error(`Unsupported component type: "${accessorData.componentType}"`);
			}
			indicesBuffer = new ArrayBuffer(accessorData.count * bytesPerComponent);
		}
	}

	let vertexCount = 0;
	let vertexCountSet = false;
	for (const [attributeName, accessorIndex] of Object.entries(gltfPrimitive.attributes)) {
		const { accessorData, attributeType, format, unsigned, componentCount } = await getVertexAccessorData(gltfJsonData, accessorIndex, attributeName);
		const extensionBuffer = extensionAttributes.get(attributeType);

		let buffer;
		if (extensionBuffer) {
			buffer = extensionBuffer;
		} else if (accessorData.bufferView != undefined) {
			buffer = await parsingContext.getBufferView(accessorData.bufferView, accessorData.byteOffset);
		} else {
			// According to the spec we're supposed to create a buffer with all zeros.
			// However, a renda Mesh instance already creates buffers as long as we provide it the right
			// attribute formats and index counts. So we'll just return `null` here,
			// to signal that no vertex data needs to be set.
			buffer = null;
		}

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

		if (buffer) {
			meshBuffers.set(attributeType, buffer);
		}
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

	const material = await getMaterialFn(gltfPrimitive.material);

	return { mesh, material };
}

/**
 * @param {import("./gltfParsing.js").GltfJsonData} gltfJsonData
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
 * @param {import("./gltfParsing.js").GltfJsonData} gltfJsonData
 * @param {number} accessorIndex
 * @param {string} attributeName
 */
async function getVertexAccessorData(gltfJsonData, accessorIndex, attributeName) {
	const accessorData = getAccessorData(gltfJsonData, accessorIndex);

	if (accessorData.componentType == UNSIGNED_INT) {
		throw new Error("Accessor component type UNSIGNED_INT is only allowed for index buffers.");
	}

	const attributeType = gltfAttributeNameToRendaAttributeType(attributeName);
	let format;
	let unsigned;
	let componentCount;

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
			throw new Error(`Unsupported component type: "${accessorData.componentType}"`);
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
			throw new Error(`Unsupported accessor type: "${accessorData.type}"`);
	}

	return {
		accessorData,
		attributeType,
		format,
		unsigned,
		componentCount,
	};
}

/**
 * @param {import("./gltfParsing.js").GltfJsonData} gltfJsonData
 * @param {number} accessorIndex
 */
async function getIndexAccessorData(gltfJsonData, accessorIndex) {
	const accessorData = getAccessorData(gltfJsonData, accessorIndex);

	if (accessorData.type != "SCALAR") {
		throw new Error("Accessor type must be SCALAR for index buffers.");
	}

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

	return {
		format,
		accessorData,
	};
}

/**
 * @param {string} attributeName
 */
export function gltfAttributeNameToRendaAttributeType(attributeName) {
	switch (attributeName) {
		case "POSITION":
			return Mesh.AttributeType.POSITION;
		case "NORMAL":
			return Mesh.AttributeType.NORMAL;
		case "TANGENT":
			return Mesh.AttributeType.TANGENT;
		case "TEXCOORD_0":
			return Mesh.AttributeType.UV1;
		case "TEXCOORD_1":
			return Mesh.AttributeType.UV2;
		case "COLOR_0":
			return Mesh.AttributeType.COLOR;
		default:
			throw new Error(`Unknown attribute type: ${attributeName}`);
	}
}
