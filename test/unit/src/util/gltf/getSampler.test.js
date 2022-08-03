import {assertEquals, assertRejects, assertStrictEquals} from "std/testing/asserts.ts";
import {Sampler} from "../../../../../src/rendering/Sampler.js";
import {CLAMP_TO_EDGE, LINEAR, LINEAR_MIPMAP_LINEAR, LINEAR_MIPMAP_NEAREST, MIRRORED_REPEAT, NEAREST, NEAREST_MIPMAP_LINEAR, NEAREST_MIPMAP_NEAREST, getSamplerHelper} from "../../../../../src/util/gltf/getSampler.js";

/**
 * @param {Object} options
 * @param {import("../../../../../src/util/gltf/types.js").GltfSamplerData} [options.samplerData]
 */
function basicSetup({
	samplerData = {},
} = {}) {
	/** @type {import("../../../../../src/util/gltf/types.js").GltfJsonData} */
	const jsonData = {
		asset: {version: "2.0"},
		samplers: [samplerData],
	};

	/** @type {Map<number, Sampler>} */
	const samplersCache = new Map();

	const defaultSampler = new Sampler();

	/** @type {import("../../../../../src/util/gltf/getSampler.js").GetSamplerHelperOptions} */
	const basicOptions = {
		defaultSampler,
	};

	return {
		jsonData,
		samplersCache,
		basicOptions,
		defaultSampler,
	};
}

Deno.test({
	name: "Returns the default sampler when the index is undefined",
	async fn() {
		const {jsonData, samplersCache, defaultSampler, basicOptions} = basicSetup();
		delete jsonData.samplers;
		const result = await getSamplerHelper(jsonData, undefined, samplersCache, basicOptions);

		assertStrictEquals(result, defaultSampler);
	},
});

Deno.test({
	name: "Throws when no default sampler is set and the index is undefined",
	async fn() {
		const {jsonData, samplersCache} = basicSetup();
		delete jsonData.samplers;

		await assertRejects(async () => {
			await getSamplerHelper(jsonData, undefined, samplersCache, {defaultSampler: null});
		}, Error, "A texture without a sampler was referenced and no default sampler has been provided.");
	},
});

Deno.test({
	name: "Throws when the sampler id doesn't exist",
	async fn() {
		const {jsonData, samplersCache, basicOptions} = basicSetup();

		await assertRejects(async () => {
			await getSamplerHelper(jsonData, 12345, samplersCache, basicOptions);
		}, Error, "Tried to reference sampler with index 12345 but it does not exist.");
	},
});

Deno.test({
	name: "Throws when the json doesn't contain samplers",
	async fn() {
		const {jsonData, samplersCache, basicOptions} = basicSetup();
		delete jsonData.samplers;

		await assertRejects(async () => {
			await getSamplerHelper(jsonData, 12345, samplersCache, basicOptions);
		}, Error, "Tried to reference sampler with index 12345 but it does not exist.");
	},
});

Deno.test({
	name: "Uses cached samplers",
	async fn() {
		const {jsonData, samplersCache, basicOptions} = basicSetup();

		const cachedSampler = new Sampler();
		samplersCache.set(0, cachedSampler);

		const result = await getSamplerHelper(jsonData, 0, samplersCache, basicOptions);

		assertStrictEquals(result, cachedSampler);
	},
});

Deno.test({
	name: "Creating a sampler with the default sampler options",
	async fn() {
		const {jsonData, samplersCache, basicOptions} = basicSetup();

		const result = await getSamplerHelper(jsonData, 0, samplersCache, basicOptions);

		assertEquals(result.descriptor.addressModeU, "repeat");
		assertEquals(result.descriptor.addressModeV, "repeat");
		assertEquals(result.descriptor.addressModeW, "repeat");
		assertEquals(result.descriptor.magFilter, "linear");
		assertEquals(result.descriptor.minFilter, "linear");
		assertEquals(result.descriptor.mipmapFilter, "linear");
	},
});

Deno.test({
	name: "Creating a sampler with different address modes",
	async fn() {
		const {jsonData, samplersCache, basicOptions} = basicSetup({
			samplerData: {
				wrapS: CLAMP_TO_EDGE,
				wrapT: MIRRORED_REPEAT,
			},
		});

		const result = await getSamplerHelper(jsonData, 0, samplersCache, basicOptions);

		assertEquals(result.descriptor.addressModeU, "clamp-to-edge");
		assertEquals(result.descriptor.addressModeV, "mirror-repeat");
		assertEquals(result.descriptor.addressModeW, "repeat");
	},
});

Deno.test({
	name: "Creating a sampler with nearest filters",
	async fn() {
		const {jsonData, samplersCache, basicOptions} = basicSetup({
			samplerData: {
				magFilter: NEAREST,
				minFilter: NEAREST_MIPMAP_NEAREST,
			},
		});

		const result = await getSamplerHelper(jsonData, 0, samplersCache, basicOptions);

		assertEquals(result.descriptor.magFilter, "nearest");
		assertEquals(result.descriptor.minFilter, "nearest");
		assertEquals(result.descriptor.mipmapFilter, "nearest");
	},
});

Deno.test({
	name: "Creating a sampler with LINEAR_MIPMAP_NEAREST",
	async fn() {
		const {jsonData, samplersCache, basicOptions} = basicSetup({
			samplerData: {
				magFilter: NEAREST,
				minFilter: LINEAR_MIPMAP_NEAREST,
			},
		});

		const result = await getSamplerHelper(jsonData, 0, samplersCache, basicOptions);

		assertEquals(result.descriptor.magFilter, "nearest");
		assertEquals(result.descriptor.minFilter, "linear");
		assertEquals(result.descriptor.mipmapFilter, "nearest");
	},
});

Deno.test({
	name: "Creating a sampler with NEAREST_MIPMAP_LINEAR",
	async fn() {
		const {jsonData, samplersCache, basicOptions} = basicSetup({
			samplerData: {
				magFilter: NEAREST,
				minFilter: NEAREST_MIPMAP_LINEAR,
			},
		});

		const result = await getSamplerHelper(jsonData, 0, samplersCache, basicOptions);

		assertEquals(result.descriptor.magFilter, "nearest");
		assertEquals(result.descriptor.minFilter, "nearest");
		assertEquals(result.descriptor.mipmapFilter, "linear");
	},
});

Deno.test({
	name: "Creating a sampler with LINEAR_MIPMAP_LINEAR",
	async fn() {
		const {jsonData, samplersCache, basicOptions} = basicSetup({
			samplerData: {
				magFilter: LINEAR,
				minFilter: LINEAR_MIPMAP_LINEAR,
			},
		});

		const result = await getSamplerHelper(jsonData, 0, samplersCache, basicOptions);

		assertEquals(result.descriptor.magFilter, "linear");
		assertEquals(result.descriptor.minFilter, "linear");
		assertEquals(result.descriptor.mipmapFilter, "linear");
	},
});
