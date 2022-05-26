import {MAJOR_GLTF_PARSER_VERSION, MINOR_GLTF_PARSER_VERSION} from "./constants.js";
import {parseScenes} from "./parseNodeHierarchy.js";
import {applyMeshComponents} from "./applyMeshComponents.js";

/**
 * @param {import("./types.js").GltfJsonData} jsonData
 * @param {Object} [options]
 * @param {ArrayBuffer?} [options.containerBinary] The binary data in case the glTF is using the binary container format.
 */
export async function parseJsonData(jsonData, {
	containerBinary = null,
} = {}) {
	assertAssetVersion(jsonData);

	const bufferDatas = jsonData.buffers || [];
	/** @type {Map<number, ArrayBuffer>} */
	const createdBuffers = new Map();
	/**
	 * @param {number} bufferId
	 */
	async function getBuffer(bufferId) {
		const bufferData = bufferDatas[bufferId];
		if (!bufferData) {
			throw new Error(`Tried to reference buffer with index ${bufferId} but it does not exist.`);
		}

		let createdBuffer = createdBuffers.get(bufferId);
		if (!createdBuffer) {
			let buffer;
			if (bufferData.uri === undefined) {
				if (bufferId !== 0) {
					throw new Error(`Failed to get the buffer with index ${bufferId} because no uri was specified and it is not the first buffer in the glTF.`);
				}
				if (!containerBinary) {
					throw new Error(`Failed to get the buffer with index ${bufferId} because no uri was specified and no binary data was provided via the .glb container format.`);
				}
				buffer = containerBinary;
			}
			if (!buffer) {
				// TODO: handle uris using fetch
				throw new Error("Uri buffers are not yet implemented.");
			}
			createdBuffer = buffer.slice(0, bufferData.byteLength);
			createdBuffers.set(bufferId, createdBuffer);
		}

		return createdBuffer;
	}

	let entity = null;
	if (jsonData.scenes) {
		const scenesResult = parseScenes(jsonData.scenes, jsonData.nodes);
		entity = scenesResult.entity;
		const entityNodeIds = scenesResult.entityNodeIds;
		applyMeshComponents(jsonData, entityNodeIds, getBuffer);
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
