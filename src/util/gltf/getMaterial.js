import {Material} from "../../rendering/Material.js";
import {getGltfTextureData} from "./getTexture.js";

/** @typedef {(materialId: number | undefined) => Promise<Material>} GetMaterialFn */

/**
 * @typedef GetMaterialHelperOptions
 * @property {Material} defaultMaterial
 * @property {import("../../rendering/MaterialMap.js").MaterialMap} defaultMaterialMap
 * @property {import("./getSampler.js").GetSamplerFn} getSamplerFn
 * @property {import("./getTexture.js").GetTextureFn} getTextureFn
 */

/**
 * Helper function for parsing and caching gltf materials.
 *
 * @param {import("./gltfParsing.js").GltfJsonData} jsonData
 * @param {number | undefined} materialId The index of the material to get from the jsonData.
 * @param {Map<number, Material>} materialsCache
 * @param {GetMaterialHelperOptions} options
 */
export async function getMaterialHelper(jsonData, materialId, materialsCache, {
	defaultMaterial,
	defaultMaterialMap,
	getSamplerFn,
	getTextureFn,
}) {
	if (materialId == undefined) {
		return defaultMaterial;
	}

	let material = materialsCache.get(materialId);
	if (!material) {
		const materialDatas = jsonData.materials || [];
		const materialData = materialDatas[materialId];
		if (!materialData) {
			throw new Error(`Tried to reference material with index ${materialId} but it does not exist.`);
		}

		material = new Material(defaultMaterialMap);

		const pbr = materialData.pbrMetallicRoughness;
		if (pbr) {
			if (pbr.baseColorFactor != undefined) {
				material.setProperty("albedoAdjust", pbr.baseColorFactor);
			}
			if (pbr.baseColorTexture) {
				const textureData = getGltfTextureData(jsonData, pbr.baseColorTexture.index);
				const sampler = await getSamplerFn(textureData.sampler);
				material.setProperty("albedoSampler", sampler);
				const texture = await getTextureFn(textureData.source);
				material.setProperty("albedoTexture", texture);
			}

			if (pbr.metallicFactor != undefined) {
				material.setProperty("metallicAdjust", pbr.metallicFactor);
			}
			if (pbr.roughnessFactor != undefined) {
				material.setProperty("roughnessAdjust", pbr.roughnessFactor);
			}
			if (pbr.metallicRoughnessTexture) {
				const textureData = getGltfTextureData(jsonData, pbr.metallicRoughnessTexture.index);
				const sampler = await getSamplerFn(textureData.sampler);
				material.setProperty("metallicRoughnessSampler", sampler);
				const texture = await getTextureFn(textureData.source);
				material.setProperty("metallicRoughnessTexture", texture);
			}
		}

		if (materialData.normalTexture) {
			const textureData = getGltfTextureData(jsonData, materialData.normalTexture.index);
			const sampler = await getSamplerFn(textureData.sampler);
			material.setProperty("normalSampler", sampler);
			const texture = await getTextureFn(textureData.source);
			material.setProperty("normalTexture", texture);

			if (materialData.normalTexture.scale != undefined) {
				material.setProperty("normalScale", materialData.normalTexture.scale);
			}
		}
	}

	return material;
}
