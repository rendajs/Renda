import {parseContainerBinary} from "./parseContainerBinary.js";
import {parseJsonData} from "./parseJsonData.js";

/**
 * @param {ArrayBuffer} gltfBlob
 */
export async function parseGltf(gltfBlob) {
	const containerData = parseContainerBinary(gltfBlob);
	return await parseJsonData(containerData.json, {
		containerBinary: containerData.binary,
	});
}
