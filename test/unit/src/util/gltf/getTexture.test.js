import {assertEquals, assertRejects, assertStrictEquals, assertThrows} from "std/testing/asserts";
import {Texture} from "../../../../../src/core/Texture.js";
import {getGltfTextureData, getTextureHelper} from "../../../../../src/util/gltf/getTexture.js";

function basicSetup() {
	/** @type {import("../../../../../src/util/gltf/types.js").GltfJsonData} */
	const jsonData = {
		asset: {version: "2.0"},
	};

	/** @type {Map<number, Texture>} */
	const texturesCache = new Map();

	return {
		jsonData,
		texturesCache,
	};
}

Deno.test({
	name: "getTextureHelper throws when imageId is undefined",
	async fn() {
		const {jsonData, texturesCache} = basicSetup();
		await assertRejects(async () => {
			await getTextureHelper(jsonData, undefined, texturesCache);
		}, Error, "Tried to reference image with index undefined which is not supported.");
	},
});

Deno.test({
	name: "getTextureHelper throws when the texture id doesn't exist",
	async fn() {
		const {jsonData, texturesCache} = basicSetup();

		await assertRejects(async () => {
			await getTextureHelper(jsonData, 12345, texturesCache);
		}, Error, "Tried to reference image with index 12345 but it does not exist.");
	},
});

Deno.test({
	name: "getTextureHelper throws when the json doesn't contain textures",
	async fn() {
		const {jsonData, texturesCache} = basicSetup();
		delete jsonData.textures;

		await assertRejects(async () => {
			await getTextureHelper(jsonData, 12345, texturesCache);
		}, Error, "Tried to reference image with index 12345 but it does not exist.");
	},
});

Deno.test({
	name: "getTextureHelper uses cached samplers",
	async fn() {
		const {jsonData, texturesCache} = basicSetup();

		const cachedSampler = new Texture(new Blob());
		texturesCache.set(0, cachedSampler);

		const result = await getTextureHelper(jsonData, 0, texturesCache);

		assertStrictEquals(result, cachedSampler);
	},
});

Deno.test({
	name: "getGltfTextureData throws when the texture id doesn't exist",
	fn() {
		/** @type {import("../../../../../src/util/gltf/types.js").GltfJsonData} */
		const jsonData = {
			asset: {version: "2.0"},
			textures: [
				{
					sampler: 0,
					source: 0,
				},
			],
		};

		assertThrows(() => {
			getGltfTextureData(jsonData, 12345);
		}, Error, "Tried to reference texture with index 12345 but it does not exist.");
	},
});

Deno.test({
	name: "getGltfTextureData throws when the textures array doesn't exist",
	fn() {
		/** @type {import("../../../../../src/util/gltf/types.js").GltfJsonData} */
		const jsonData = {
			asset: {version: "2.0"},
		};

		assertThrows(() => {
			getGltfTextureData(jsonData, 0);
		}, Error, "Tried to reference texture with index 0 but it does not exist.");
	},
});

Deno.test({
	name: "getGltfTextureData returns the correct data",
	fn() {
		const result = getGltfTextureData({
			asset: {version: "2.0"},
			textures: [
				{
					sampler: 123,
					source: 456,
				},
			],
		}, 0);

		assertEquals(result, {
			sampler: 123,
			source: 456,
		});
	},
});
