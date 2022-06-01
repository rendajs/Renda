import {MAJOR_GLTF_PARSER_VERSION, MINOR_GLTF_PARSER_VERSION} from "./constants.js";
import {parseScenes} from "./parseNodeHierarchy.js";
import {applyMeshComponents} from "./applyMeshComponents.js";
import {getMaterialHelper} from "./getMaterial.js";
import {Material} from "../../rendering/Material.js";
import {MaterialMap} from "../../rendering/MaterialMap.js";
import {getTextureHelper} from "./getTexture.js";
import {getSamplerHelper} from "./getSampler.js";

/**
 * @typedef ParseJsonDataOptions
 * @property {ArrayBuffer?} [containerBinary] The binary data in case the glTF is using the binary container format.
 * @property {import("../../rendering/Material.js").Material?} defaultMaterial
 * @property {import("../../rendering/MaterialMap.js").MaterialMap?} defaultMaterialMap
 * @property {import("../../rendering/Sampler.js").Sampler?} defaultSampler
 */

/**
 * @param {import("./types.js").GltfJsonData} jsonData
 * @param {ParseJsonDataOptions} options
 */
export async function parseJsonData(jsonData, {
	containerBinary = null,
	defaultMaterial,
	defaultMaterialMap,
	defaultSampler,
}) {
	assertAssetVersion(jsonData);

	/** @type {Map<number, ArrayBuffer>} */
	const createdBuffers = new Map();
	/**
	 * @param {number} bufferId
	 */
	async function getBufferFn(bufferId) {
		return await getBufferHelper(jsonData, bufferId, createdBuffers, containerBinary);
	}

	/** @type {Map<number, import("../../rendering/Sampler.js").Sampler>} */
	const createdSamplers = new Map();

	/** @type {import("./getSampler.js").GetSamplerFn} */
	async function getSamplerFn(samplerId) {
		return await getSamplerHelper(jsonData, samplerId, createdSamplers, {
			defaultSampler,
		});
	}

	/** @type {Map<number, import("../../core/Texture.js").Texture>} */
	const createdTextures = new Map();

	/** @type {import("./getTexture.js").GetTextureFn} */
	async function getTextureFn(imageId) {
		return await getTextureHelper(jsonData, imageId, createdTextures);
	}

	if (!defaultMaterial) {
		defaultMaterial = new Material();
	}
	const nonNullDefaultMaterial = defaultMaterial;

	if (!defaultMaterialMap) {
		defaultMaterialMap = new MaterialMap();
	}
	const nonNullDefaultMaterialMap = defaultMaterialMap;

	/** @type {Map<number, import("../../rendering/Material.js").Material>} */
	const createdMaterials = new Map();

	/** @type {import("./getMaterial.js").GetMaterialFn} */
	async function getMaterialFn(materialId) {
		return await getMaterialHelper(jsonData, materialId, createdMaterials, {
			defaultMaterial: nonNullDefaultMaterial,
			defaultMaterialMap: nonNullDefaultMaterialMap,
			getSamplerFn,
			getTextureFn,
		});
	}

	let entity = null;
	if (jsonData.scenes) {
		const scenesResult = parseScenes(jsonData.scenes, jsonData.nodes);
		entity = scenesResult.entity;
		const entityNodeIds = scenesResult.entityNodeIds;
		applyMeshComponents(jsonData, entityNodeIds, {
			getBufferFn,
			getMaterialFn,
		});
	} else {
		// TODO: parse glTF as if it is a library of assets
	}

	return {entity};
}

/**
 * Checks the version and minVersion of the json asset data against the
 * version of the parser and throws an error if the asset requires a newer
 * version of the parser.
 * @param {import("./types.js").GltfJsonData} json
 */
function assertAssetVersion(json) {
	if (json.asset.minVersion !== undefined) {
		const {major, minor} = parseVersionString(json.asset.minVersion);
		if (major > MAJOR_GLTF_PARSER_VERSION || minor > MINOR_GLTF_PARSER_VERSION) {
			throw new Error("The asset requires a newer glTF version: " + json.asset.minVersion);
		}
	}
	const {major} = parseVersionString(json.asset.version);
	if (major !== MAJOR_GLTF_PARSER_VERSION) {
		throw new Error("The asset targets a higher major glTF version: " + json.asset.version);
	}
}

/**
 * @param {string} str
 */
function parseVersionString(str) {
	const version = str.split(".");
	if (version.length !== 2) {
		throw new Error("Failed to parse glTF version string: " + str);
	}
	const major = parseInt(version[0], 10);
	const minor = parseInt(version[1], 10);
	if (isNaN(major) || isNaN(minor)) {
		throw new Error("Failed to parse glTF version string: " + str);
	}
	return {major, minor};
}

/**
 * Helper function for parsing and caching gltf buffers.
 *
 * @param {import("./types.js").GltfJsonData} jsonData
 * @param {number} bufferId The index of the buffer to get from the jsonData.
 * @param {Map<number, ArrayBuffer>} buffersCache
 * @param {ArrayBuffer?} containerBinary The binary data in case the glTF is using the binary container format.
 */
async function getBufferHelper(jsonData, bufferId, buffersCache, containerBinary) {
	const bufferDatas = jsonData.buffers || [];
	const bufferData = bufferDatas[bufferId];
	if (!bufferData) {
		throw new Error(`Tried to reference buffer with index ${bufferId} but it does not exist.`);
	}

	let cachedBuffer = buffersCache.get(bufferId);
	if (!cachedBuffer) {
		let buffer;
		if (bufferData.uri === undefined) {
			if (bufferId !== 0) {
				throw new Error(`Failed to get the buffer with index ${bufferId} because no uri was specified and it is not the first buffer in the glTF.`);
			}
			if (!containerBinary) {
				throw new Error(`Failed to get the buffer with index ${bufferId} because no uri was specified and no binary data was provided via the .glb container format.`);
			}
			buffer = containerBinary;
		} else {
			if (bufferData.uri.startsWith("data:")) {
				const response = await fetch(bufferData.uri);
				const contentType = response.headers.get("content-type") || "none";
				if (contentType != "application/octet-stream" && contentType != "application/gltf-buffer") {
					throw new Error(`Failed to get the buffer with index ${bufferId} because the data uri has the incorrect content type: ${contentType}`);
				}
				buffer = await response.arrayBuffer();
			} else {
				throw new Error("Uri buffers are not yet implemented except for data uris.");
			}
		}
		cachedBuffer = buffer.slice(0, bufferData.byteLength);
		buffersCache.set(bufferId, cachedBuffer);
	}

	return cachedBuffer;
}
