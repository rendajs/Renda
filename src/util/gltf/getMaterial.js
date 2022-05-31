import {Material} from "../../rendering/Material.js";

/**
 * @typedef {(materialId: number | undefined) => Promise<Material>} GetMaterialFn
 */

/**
 * Helper function for parsing and caching gltf materials.
 *
 * @param {import("./types.js").GltfJsonData} jsonData
 * @param {number | undefined} materialId The index of the material to get from the jsonData.
 * @param {Map<number, Material>} materialsCache
 * @param {Object} options
 * @param {Material} options.defaultMaterial
 * @param {import("../../rendering/MaterialMap.js").MaterialMap} options.defaultMaterialMap
 */
export async function getMaterialHelper(jsonData, materialId, materialsCache, {
	defaultMaterial,
	defaultMaterialMap,
}) {
	if (materialId == undefined) {
		return defaultMaterial;
	}
	const materialDatas = jsonData.materials || [];
	const materialData = materialDatas[materialId];
	if (!materialData) {
		throw new Error(`Tried to reference material with index ${materialId} but it does not exist.`);
	}

	let material = materialsCache.get(materialId);
	if (!material) {
		material = new Material(defaultMaterialMap);

		const pbr = materialData.pbrMetallicRoughness;
		if (pbr) {
			if (pbr.metallicFactor != undefined) {
				material.setProperty("metallicAdjust", pbr.metallicFactor);
			}
			if (pbr.roughnessFactor != undefined) {
				material.setProperty("roughnessAdjust", pbr.roughnessFactor);
			}
		}
	}

	return material;
}
