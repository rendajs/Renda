import { assertSpyCall, assertSpyCalls, spy } from "std/testing/mock.ts";
import { assertEquals, assertRejects, assertStrictEquals, assertThrows } from "std/testing/asserts.ts";
import { Texture } from "../../../../../src/core/Texture.js";
import { getGltfTextureData, getTextureHelper } from "../../../../../src/util/gltf/getTexture.js";
import { createMockParsingContext } from "./shared.js";

function basicSetup() {
	/** @type {import("../../../../../src/util/gltf/gltfParsing.js").GltfJsonData} */
	const jsonData = {
		asset: { version: "2.0" },
	};

	/** @type {Map<number, Texture>} */
	const texturesCache = new Map();

	const parsingContext = createMockParsingContext();

	return {
		jsonData,
		texturesCache,
		parsingContext,
	};
}

Deno.test({
	name: "getTextureHelper throws when imageId is undefined",
	async fn() {
		const { jsonData, texturesCache, parsingContext } = basicSetup();
		await assertRejects(async () => {
			await getTextureHelper(jsonData, undefined, texturesCache, parsingContext);
		}, Error, "Tried to reference image with index undefined which is not supported.");
	},
});

Deno.test({
	name: "getTextureHelper throws when the texture id doesn't exist",
	async fn() {
		const { jsonData, texturesCache, parsingContext } = basicSetup();

		await assertRejects(async () => {
			await getTextureHelper(jsonData, 12345, texturesCache, parsingContext);
		}, Error, "Tried to reference image with index 12345 but it does not exist.");
	},
});

Deno.test({
	name: "getTextureHelper throws when the json doesn't contain textures",
	async fn() {
		const { jsonData, texturesCache, parsingContext } = basicSetup();
		delete jsonData.textures;

		await assertRejects(async () => {
			await getTextureHelper(jsonData, 12345, texturesCache, parsingContext);
		}, Error, "Tried to reference image with index 12345 but it does not exist.");
	},
});

Deno.test({
	name: "getTextureHelper uses cached samplers",
	async fn() {
		const { jsonData, texturesCache, parsingContext } = basicSetup();

		const cachedSampler = new Texture(new Blob());
		texturesCache.set(0, cachedSampler);

		const result = await getTextureHelper(jsonData, 0, texturesCache, parsingContext);

		assertStrictEquals(result, cachedSampler);
	},
});

Deno.test({
	name: "getTextureHelper throws when the image contains neither a uri nor a bufferView property",
	async fn() {
		const { jsonData, texturesCache, parsingContext } = basicSetup();

		jsonData.images = [{}];

		await assertRejects(async () => {
			await getTextureHelper(jsonData, 0, texturesCache, parsingContext);
		}, Error, "The image with index 0 contains invalid data. An image should contain one of 'uri' or 'bufferView'.");
	},
});

Deno.test({
	name: "getTextureHelper throws when the image contains a bufferView property without a mimetype",
	async fn() {
		const { jsonData, texturesCache, parsingContext } = basicSetup();

		jsonData.images = [
			{
				bufferView: 0,
			},
		];

		await assertRejects(async () => {
			await getTextureHelper(jsonData, 0, texturesCache, parsingContext);
		}, Error, "The image with index 0 has no mime type specified, this is required for buffer view images.");
	},
});

Deno.test({
	name: "getTextureHelper creates a texture with a blob from getBufferFn",
	async fn() {
		const { jsonData, texturesCache, parsingContext } = basicSetup();

		const getBufferSpy = spy(parsingContext, "getBuffer");

		jsonData.images = [
			{
				bufferView: 0,
				mimeType: "image/png",
			},
		];
		jsonData.bufferViews = [
			{
				buffer: 0,
				byteLength: 10,
			},
		];

		const result = await getTextureHelper(jsonData, 0, texturesCache, parsingContext);

		assertEquals(result.blob.type, "image/png");
		assertSpyCalls(getBufferSpy, 1);
		assertSpyCall(getBufferSpy, 0, {
			args: [0],
		});
	},
});

Deno.test({
	name: "getGltfTextureData throws when the texture id doesn't exist",
	fn() {
		/** @type {import("../../../../../src/util/gltf/gltfParsing.js").GltfJsonData} */
		const jsonData = {
			asset: { version: "2.0" },
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
		/** @type {import("../../../../../src/util/gltf/gltfParsing.js").GltfJsonData} */
		const jsonData = {
			asset: { version: "2.0" },
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
			asset: { version: "2.0" },
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
