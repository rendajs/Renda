
/**
 * Helper function for parsing and caching gltf buffers.
 *
 * @param {import("./types.js").GltfJsonData} jsonData
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
 * Helper function for getting texture data from a gltf file and asserting that
 * it actually exists.
 *
 * @param {import("./types.js").GltfJsonData} jsonData
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
