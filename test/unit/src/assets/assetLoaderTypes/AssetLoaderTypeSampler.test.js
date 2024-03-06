import { assertEquals, assertInstanceOf } from "std/testing/asserts.ts";
import { AssetLoaderTypeSampler, objectToBinary } from "../../../../../src/mod.js";
import { Sampler } from "../../../../../src/rendering/Sampler.js";

Deno.test({
	name: "parseBuffer",
	async fn() {
		const mockAssetLoader = /** @type {import("../../../../../src/mod.js").AssetLoader} */ ({});
		const loaderType = new AssetLoaderTypeSampler(mockAssetLoader);

		const buffer = objectToBinary({
			addressModeU: "clamp-to-edge",
			addressModeV: "repeat",
			addressModeW: "mirror-repeat",
			minFilter: "linear",
			magFilter: "nearest",
			mipmapFilter: "linear",
		}, AssetLoaderTypeSampler.binarySerializationOpts);
		const result = await loaderType.parseBuffer(buffer);
		assertInstanceOf(result, Sampler);
		assertEquals(result.descriptor, {
			addressModeU: "clamp-to-edge",
			addressModeV: "repeat",
			addressModeW: "mirror-repeat",
			minFilter: "linear",
			magFilter: "nearest",
			mipmapFilter: "linear",
		});
	},
});
