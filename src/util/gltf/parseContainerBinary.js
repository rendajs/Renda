/**
 * Chunk types as specified by the glTF spec. These are used in chunk headers
 * to indicate what kind of chunk is stored.
 * @readonly
 * @enum {number}
 */
export const ChunkType = /** @type {const} */ ({
	JSON: 0x4E4F534A,
	BIN: 0x004E4942,
});

/**
 * @typedef GltfContainerData
 * @property {import("./gltfParsing.js").GltfJsonData} json
 * @property {ArrayBuffer?} binary
 */

/**
 * Parses binary gltf container data according to the gltf spec.
 * @param {ArrayBuffer} data
 * @returns {GltfContainerData}
 */
export function parseContainerBinary(data) {
	const dataView = new DataView(data);
	let byteIndex = 0;
	const magic = dataView.getUint32(byteIndex, true);
	byteIndex += 4;
	if (magic !== 0x46546C67) {
		throw new Error("The provided file doesn't have a valid glTF format. The file is missing the glTF magic header.");
	}

	const version = dataView.getUint32(byteIndex, true);
	byteIndex += 4;
	if (version > 2) {
		throw new Error("The glTF container version of this file is too new: " + version + ". The parser only supports up to version 2.");
	}

	const totalLength = dataView.getUint32(byteIndex, true);
	byteIndex += 4;
	if (totalLength > data.byteLength) {
		throw new Error("Failed to parse glTF. The length in the header is larger than the total file length.");
	}

	/** @type {Map<ChunkType, ArrayBuffer>} */
	const chunks = new Map();
	while (byteIndex < totalLength) {
		const chunkLength = dataView.getUint32(byteIndex, true);
		byteIndex += 4;
		const chunkType = dataView.getUint32(byteIndex, true);
		byteIndex += 4;

		if (byteIndex + chunkLength > totalLength) {
			throw new Error("Failed to parse glTF. The length of a chunk is larger than the total file length.");
		}
		const chunkData = data.slice(byteIndex, byteIndex + chunkLength);
		chunks.set(chunkType, chunkData);
		byteIndex += chunkLength;
	}

	const jsonBinary = chunks.get(ChunkType.JSON);
	if (!jsonBinary) {
		throw new Error("Failed to parse glTF file, no JSON chunk was found.");
	}

	const json = JSON.parse(new TextDecoder().decode(jsonBinary));
	const binary = chunks.get(ChunkType.BIN) ?? null;
	return {json, binary};
}
