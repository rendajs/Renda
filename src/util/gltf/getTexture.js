import { Texture } from "../../core/Texture.js";
import { getBufferViewBuffer } from "./getBuffer.js";

/** @typedef {(imageId: number | undefined) => Promise<Texture>} GetTextureFn */

/**
 * @typedef GetTextureHelperOptions
 * @property {import("./getBuffer.js").GetBufferFn} getBufferFn
 */

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
 * @param {import("./gltfParsing.js").GltfJsonData} jsonData
 * @param {number | undefined} imageId The index of the image to get from the jsonData.
 * @param {Map<number, Texture>} texturesCache
 * @param {GetTextureHelperOptions} options
 */
export async function getTextureHelper(jsonData, imageId, texturesCache, {
	getBufferFn,
}) {
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

		let blob;
		if (imageData.uri) {
			throw new Error("Loading textures using uris is not yet supported");
		} else if (imageData.bufferView != undefined) {
			if (!imageData.mimeType) {
				throw new Error(`The image with index ${imageId} has no mime type specified, this is required for buffer view images.`);
			}
			const buffer = await getBufferViewBuffer(jsonData, imageData.bufferView, getBufferFn);
			blob = new Blob([buffer], { type: imageData.mimeType });
		} else {
			throw new Error(`The image with index ${imageId} contains invalid data. An image should contain one of 'uri' or 'bufferView'.`);
		}

		texture = new Texture(blob);
	}
	return texture;
}

/**
 * Helper function for getting texture data from a gltf file and asserting that
 * it actually exists.
 *
 * @param {import("./gltfParsing.js").GltfJsonData} jsonData
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
