import {parseContainerBinary} from "./parseContainerBinary.js";
import {parseJsonData} from "./parseJsonData.js";

/**
 * @param {ArrayBuffer} glbBuffer
 * @param {Object} [options]
 * @param {import("../../rendering/Material.js").Material?} [options.defaultMaterial]
 * @param {import("../../rendering/MaterialMap.js").MaterialMap?} [options.defaultMaterialMap]
 * @param {"gltf" | "glb"} [options.fileExtension] Used for asserting that the file has the correct format.
 * This way you get more helpful error messages should you provide a buffer from a non gltf file.
 */
export async function parseGltf(glbBuffer, {
	defaultMaterial = null,
	defaultMaterialMap = null,
	fileExtension = "glb",
} = {}) {
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
	});
}
