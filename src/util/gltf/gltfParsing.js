import {parseContainerBinary} from "./parseContainerBinary.js";
import {parseJsonData} from "./parseJsonData.js";

/**
 * @typedef ParseGltfHooks
 * @property {(context: ParsedGltfNodeHookContext) => void} [node]
 * @property {(context: ParsedGltfMaterialHookContext) => void} [material]
 */

/**
 * @typedef ParsedGltfNodeHookContext
 * @property {import("../../mod.js").Entity} entity
 * @property {GltfNodeData} nodeData
 * @property {number} nodeId
 */

/**
 * @typedef ParsedGltfMaterialHookContext
 * @property {import("../../mod.js").Material} material
 * @property {GltfMaterialData?} materialData
 * @property {number} materialId
 */

/**
 * @typedef {{[extensionName: string]: any}} GltfExtensionData
 */

/** @typedef {unknown} GltfExtrasData */

/**
 * @typedef GltfObjectBase
 * @property {GltfExtensionData} [extensions]
 * @property {GltfExtrasData} [extras]
 */

/**
 * @typedef {{name?: string} & GltfObjectBase} GltfNamedObjectBase
 */

/**
 * @typedef {GltfObjectBase & GltfJsonDataExtends} GltfJsonData
 */
/**
 * @typedef GltfJsonDataExtends
 * @property {string[]} [extensionsUsed]
 * @property {string[]} [extensionsRequired]
 * @property {GltfAccessorData[]} [accessors]
 * @property {GltfAssetData} asset
 * @property {GltfBufferData[]} [buffers]
 * @property {GltfBufferViewData[]} [bufferViews]
 * @property {GltfImageData[]} [images]
 * @property {GltfMaterialData[]} [materials]
 * @property {GltfMeshData[]} [meshes]
 * @property {GltfNodeData[]} [nodes]
 * @property {GltfSamplerData[]} [samplers]
 * @property {number} [scene]
 * @property {GltfSceneData[]} [scenes]
 * @property {GltfTextureData[]} [textures]
 */

/**
 * @typedef {GltfObjectBase & GltfAssetDataExtends} GltfAssetData
 */
/**
 * @typedef GltfAssetDataExtends
 * @property {string} [copyright]
 * @property {string} [generator]
 * @property {string} version
 * @property {string} [minVersion]
 */

/**
 * @typedef {GltfNamedObjectBase & GltfNodeDataExtends} GltfNodeData
 */
/**
 * @typedef GltfNodeDataExtends
 * @property {number} [camera]
 * @property {number[]} [children]
 * @property {number} [skin]
 * @property {number[]} [matrix]
 * @property {number} [mesh]
 * @property {number[]} [rotation]
 * @property {number[]} [scale]
 * @property {number[]} [translation]
 * @property {number[]} [weights]
 */

/**
 * @typedef {GltfNamedObjectBase & {nodes?: number[]}} GltfSceneData
 */

/**
 * @typedef {GltfNamedObjectBase & GltfMaterialDataExtends} GltfMaterialData
 */
/**
 * @typedef GltfMaterialDataExtends
 * @property {GltfMaterialPbrMetallicRoughnessData} [pbrMetallicRoughness]
 * @property {GltfNormalTextureInfoData} [normalTexture]
 * @property {GltfOcclusionTextureInfoData} [occlusionTexture]
 * @property {GltfTextureInfoData} [emissiveTexture]
 * @property {number[]} [emissiveFactor]
 * @property {string} [alphaMode]
 * @property {number} [alphaCutoff]
 * @property {boolean} [doubleSided]
 */

/**
 * @typedef {GltfObjectBase & GltfMaterialPbrMetallicRoughnessDataExtends} GltfMaterialPbrMetallicRoughnessData
 */
/**
 * @typedef GltfMaterialPbrMetallicRoughnessDataExtends
 * @property {number[]} [baseColorFactor]
 * @property {GltfTextureInfoData} [baseColorTexture]
 * @property {number} [metallicFactor]
 * @property {number} [roughnessFactor]
 * @property {GltfTextureInfoData} [metallicRoughnessTexture]
 */

/**
 * @typedef {GltfNamedObjectBase & GltfTextureDataExtends} GltfTextureData
 */
/**
 * @typedef GltfTextureDataExtends
 * @property {number} [sampler]
 * @property {number} [source]
 */

/**
 * @typedef {GltfNamedObjectBase & GltfSamplerDataExtends} GltfSamplerData
 */
/**
 * @typedef GltfSamplerDataExtends
 * @property {number} [magFilter]
 * @property {number} [minFilter]
 * @property {number} [wrapS]
 * @property {number} [wrapT]
 */

/**
 * @typedef {GltfNamedObjectBase & GltfImageDataExtends} GltfImageData
 */
/**
 * @typedef GltfImageDataExtends
 * @property {string} [uri]
 * @property {string} [mimeType]
 * @property {number} [bufferView]
 */

/**
 * @typedef {GltfObjectBase & GltfTextureInfoDataExtends} GltfTextureInfoData
 */
/**
 * @typedef GltfTextureInfoDataExtends
 * @property {number} index
 * @property {number} [texCoord]
 */

/**
 * @typedef {GltfTextureInfoData & {scale?: number}} GltfNormalTextureInfoData
 */

/**
 * @typedef {GltfTextureInfoData & {strength?: number}} GltfOcclusionTextureInfoData
 */

/**
 * @typedef {GltfNamedObjectBase & GltfMeshDataExtends} GltfMeshData
 */
/**
 * @typedef GltfMeshDataExtends
 * @property {GltfMeshPrimitiveData[]} primitives
 * @property {number[]} [weights]
 */

/**
 * @typedef {GltfObjectBase & GltfMeshPrimitiveDataExtends} GltfMeshPrimitiveData
 */
/**
 * @typedef GltfMeshPrimitiveDataExtends
 * @property {{[x: string]: number}} attributes
 * @property {number} [indices]
 * @property {number} [material]
 * @property {number} [mode]
 * @property {never[]} [targets]
 */

/**
 * @typedef {GltfNamedObjectBase & GltfBufferDataExtends} GltfBufferData
 */
/**
 * @typedef GltfBufferDataExtends
 * @property {string} [uri]
 * @property {number} byteLength
 */

/**
 * @typedef {GltfNamedObjectBase & GltfBufferViewDataExtends} GltfBufferViewData
 */
/**
 * @typedef GltfBufferViewDataExtends
 * @property {number} buffer
 * @property {number} [byteOffset]
 * @property {number} byteLength
 * @property {number} [byteStride]
 * @property {number} [target]
 */

/** @typedef {"SCALAR" | "VEC2" | "VEC3" | "VEC4" | "MAT2" | "MAT3" | "MAT4"} GltfAccessorType */

/**
 * @typedef {GltfNamedObjectBase & GltfAccessorDataExtends} GltfAccessorData
 */
/**
 * @typedef GltfAccessorDataExtends
 * @property {number} [bufferView]
 * @property {number} [byteOffset]
 * @property {number} componentType
 * @property {boolean} [normalized]
 * @property {number} count
 * @property {GltfAccessorType} type
 * @property {number[]} [max]
 * @property {number[]} [min]
 * @property {never} [sparse]
 */

/**
 * @param {ArrayBuffer} glbBuffer
 * @param {object} options
 * @param {"gltf" | "glb"} options.fileExtension Used for asserting that the file has the correct format.
 * This way you get more helpful error messages should you provide a buffer from a non gltf file.
 * @param {import("../../rendering/Material.js").Material?} options.defaultMaterial
 * @param {import("../../rendering/MaterialMap.js").MaterialMap?} options.defaultMaterialMap
 * @param {import("../../rendering/Sampler.js").Sampler?} options.defaultSampler
 * @param {ParseGltfHooks} [options.hooks]
 */
export async function parseGltf(glbBuffer, {
	fileExtension = "glb",
	defaultMaterial,
	defaultMaterialMap,
	defaultSampler,
	hooks = {},
}) {
	let containerBinary = null;
	let jsonData;
	if (fileExtension == "glb") {
		const containerData = parseContainerBinary(glbBuffer);
		jsonData = containerData.json;
		containerBinary = containerData.binary;
	} else if (fileExtension == "gltf") {
		const jsonStr = new TextDecoder().decode(glbBuffer);
		jsonData = JSON.parse(jsonStr);
	}
	return await parseJsonData(jsonData, {
		containerBinary,
		defaultMaterial,
		defaultMaterialMap,
		defaultSampler,
		hooks,
	});
}
