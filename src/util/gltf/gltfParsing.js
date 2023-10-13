import {parseContainerBinary} from "./parseContainerBinary.js";
import {parseJsonData} from "./parseJsonData.js";

/**
 * @typedef ParseGltfHooks
 * @property {(context: ParsedGltfNodeHookContext) => void} [node]
 */

/**
 * @typedef ParsedGltfNodeHookContext
 * @property {import("../../mod.js").Entity} entity
 * @property {import("./types.js").GltfNodeData} nodeData
 * @property {number} nodeId
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
