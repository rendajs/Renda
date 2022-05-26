import {parseContainerBinary} from "./parseContainerBinary.js";
import {parseJsonData} from "./parseJsonData.js";

/**
 * @param {ArrayBuffer} gltfBlob
 * @param {Object} [options]
 * @param {import("../../rendering/Material.js").Material?} [options.defaultMaterial]
 */
export async function parseGltf(gltfBlob, {
	defaultMaterial = null,
} = {}) {
	const containerData = parseContainerBinary(gltfBlob);
	return await parseJsonData(containerData.json, {
		containerBinary: containerData.binary,
		defaultMaterial,
	});
}
