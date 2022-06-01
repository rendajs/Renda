import {Texture} from "../../core/Texture.js";

/** @typedef {(imageId: number | undefined) => Promise<Texture>} GetTextureFn */

/**
 * Helper function for parsing and caching glTF textures.
 * There is a bit of a naming mismatch between glTF and our implementation.
 * In glTF there is a concept of textures, samplers and images. Where a texture
 * is just a basic container for a single image and a sampler.
 * But in our implementation there is nu such concept as a sampler and image that
 * are required to be used together. So what this function actually does is
 * parse the 'glTF image' and return a texture from our implementation.
 * Samplers need to be parsed separately.
 *
 * @param {import("./types.js").GltfJsonData} jsonData
 * @param {number | undefined} imageId The index of the image to get from the jsonData.
 * @param {Map<number, Texture>} texturesCache
 */
export async function getTextureHelper(jsonData, imageId, texturesCache) {
	if (imageId == undefined) {
		throw new Error("Tried to reference image with index undefined which is not supported.");
	}
	let texture = texturesCache.get(imageId);
	if (!texture) {
		const imageDatas = jsonData.images || [];
		const imageData = imageDatas[imageId];
		if (!imageData) {
			throw new Error(`Tried to reference image with index ${imageId} but it does not exist.`);
		}

		texture = new Texture(new Blob());
	}
	return texture;
}

/**
 * @param {import("./types.js").GltfJsonData} jsonData
 * @param {number} textureId The index of the image to get from the jsonData.
 */
export function getGltfTextureData(jsonData, textureId) {
	const textureDatas = jsonData.textures || [];
	const textureData = textureDatas[textureId];
	if (!textureData) {
		throw new Error(`Tried to reference texture with index ${textureId} but it does not exist.`);
	}
	return textureData;
}
