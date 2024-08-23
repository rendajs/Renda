/** @typedef {(bufferId: number) => Promise<ArrayBuffer>} GetBufferFn */

/**
 * Helper function for parsing and caching gltf buffers.
 *
 * @param {import("./gltfParsing.js").GltfJsonData} jsonData
 * @param {number} bufferId The index of the buffer to get from the jsonData.
 * @param {Map<number, ArrayBuffer>} buffersCache
 * @param {ArrayBuffer?} containerBinary The binary data in case the glTF is using the binary container format.
 */
export async function getBufferHelper(jsonData, bufferId, buffersCache, containerBinary) {
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
					response.body?.cancel();
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

/**
 * Helper function for getting buffer views from a gltf file and asserting that
 * it actually exists.
 *
 * @param {import("./gltfParsing.js").GltfJsonData} jsonData
 * @param {number} bufferViewId The index of the image to get from the jsonData.
 */
export function getGltfBufferViewData(jsonData, bufferViewId) {
	const bufferViewDatas = jsonData.bufferViews || [];
	const bufferViewData = bufferViewDatas[bufferViewId];
	if (!bufferViewData) {
		throw new Error(`Tried to reference buffer view with index ${bufferViewId} but it does not exist.`);
	}
	return bufferViewData;
}

/**
 * Helper function for getting the a slice of a buffer for a specific buffer view.
 * These values are not cached.
 *
 * @param {import("./gltfParsing.js").GltfJsonData} gltfJsonData
 * @param {number} bufferViewIndex
 * @param {import("./gltfParsing.js").GltfParsingContext} parsingContext
 * @param {number} [byteOffset]
 */
export async function getBufferViewBuffer(gltfJsonData, bufferViewIndex, parsingContext, byteOffset = 0) {
	const bufferViewData = getGltfBufferViewData(gltfJsonData, bufferViewIndex);
	const fullBuffer = await parsingContext.getBuffer(bufferViewData.buffer);
	const bufferViewByteOffset = bufferViewData.byteOffset || 0;
	const totalByteOffset = bufferViewByteOffset + byteOffset;
	return fullBuffer.slice(totalByteOffset, totalByteOffset + bufferViewData.byteLength);
}
