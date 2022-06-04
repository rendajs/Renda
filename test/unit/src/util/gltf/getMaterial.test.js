import {assertSpyCall, assertSpyCalls, spy} from "std/testing/mock";
import {assertEquals, assertRejects, assertStrictEquals} from "std/testing/asserts";
import {Texture} from "../../../../../src/core/Texture.js";
import {Material} from "../../../../../src/rendering/Material.js";
import {MaterialMap} from "../../../../../src/rendering/MaterialMap.js";
import {Sampler} from "../../../../../src/rendering/Sampler.js";
import {getMaterialHelper} from "../../../../../src/util/gltf/getMaterial.js";
import {assertVecAlmostEquals} from "../../../shared/asserts.js";

function basicSetup() {
	/** @type {import("../../../../../src/util/gltf/types.js").GltfJsonData} */
	const jsonData = {
		asset: {version: "2.0"},
		materials: [
			{
				name: "Material 1",
				pbrMetallicRoughness: {
					baseColorFactor: [0.2, 0.3, 0.4, 1],
					baseColorTexture: {
						index: 0,
					},
					metallicFactor: 0.1234,
					roughnessFactor: 0.5678,
					metallicRoughnessTexture: {
						index: 1,
					},
				},
				normalTexture: {
					index: 2,
					scale: 0.5,
				},
			},
		],
		textures: [
			{
				sampler: 123,
				source: 123,
			},
			{
				sampler: 456,
				source: 456,
			},
			{
				sampler: 789,
				source: 789,
			},
		],
	};

	/** @type {Map<number, Material>} */
	const materialsCache = new Map();

	const defaultMaterial = new Material();
	const defaultMaterialMap = new MaterialMap();

	/** @type {import("../../../../../src/util/gltf/getSampler.js").GetSamplerFn} */
	const getSamplerFn = async () => {
		return new Sampler();
	};

	/** @type {import("../../../../../src/util/gltf/getTexture.js").GetTextureFn} */
	const getTextureFn = async () => {
		return new Texture(new Blob());
	};

	/** @type {import("../../../../../src/util/gltf/getMaterial.js").GetMaterialHelperOptions} */
	const basicOptions = {
		defaultMaterial,
		defaultMaterialMap,
		getSamplerFn,
		getTextureFn,
	};

	return {
		jsonData,
		materialsCache,
		basicOptions,
		defaultMaterial,
		defaultMaterialMap,
		getSamplerFn,
		getTextureFn,
	};
}

Deno.test({
	name: "Returns the default material when the index is undefined",
	async fn() {
		const {jsonData, materialsCache, defaultMaterial, basicOptions} = basicSetup();
		delete jsonData.materials;
		const result = await getMaterialHelper(jsonData, undefined, materialsCache, basicOptions);

		assertStrictEquals(result, defaultMaterial);
	},
});

Deno.test({
	name: "Throws when the material id doesn't exist",
	async fn() {
		const {jsonData, materialsCache, basicOptions} = basicSetup();

		await assertRejects(async () => {
			await getMaterialHelper(jsonData, 12345, materialsCache, basicOptions);
		}, Error, "Tried to reference material with index 12345 but it does not exist.");
	},
});

Deno.test({
	name: "Throws when the json doesn't contain materials",
	async fn() {
		const {jsonData, materialsCache, basicOptions} = basicSetup();
		delete jsonData.materials;

		await assertRejects(async () => {
			await getMaterialHelper(jsonData, 12345, materialsCache, basicOptions);
		}, Error, "Tried to reference material with index 12345 but it does not exist.");
	},
});

Deno.test({
	name: "Uses cached materials",
	async fn() {
		const {jsonData, materialsCache, basicOptions} = basicSetup();

		const cachedMaterial = new Material();
		materialsCache.set(0, cachedMaterial);

		const result = await getMaterialHelper(jsonData, 0, materialsCache, basicOptions);

		assertStrictEquals(result, cachedMaterial);
	},
});

Deno.test({
	name: "Creates pbr materials with the correct properties",
	async fn() {
		const {jsonData, materialsCache, defaultMaterial, defaultMaterialMap, getSamplerFn, getTextureFn} = basicSetup();

		const getSamplerSpy = spy(getSamplerFn);
		const getTextureSpy = spy(getTextureFn);

		const result = await getMaterialHelper(jsonData, 0, materialsCache, {
			defaultMaterial,
			defaultMaterialMap,
			getSamplerFn: getSamplerSpy,
			getTextureFn: getTextureSpy,
		});

		assertSpyCalls(getSamplerSpy, 3);
		assertSpyCall(getSamplerSpy, 0, {
			args: [123],
		});
		assertSpyCall(getSamplerSpy, 1, {
			args: [456],
		});
		assertSpyCall(getSamplerSpy, 2, {
			args: [789],
		});

		assertSpyCalls(getTextureSpy, 3);
		assertSpyCall(getTextureSpy, 0, {
			args: [123],
		});
		assertSpyCall(getTextureSpy, 1, {
			args: [456],
		});
		assertSpyCall(getTextureSpy, 2, {
			args: [789],
		});

		const albedoAdjust = result.getProperty("albedoAdjust");
		assertVecAlmostEquals(albedoAdjust, [0.2, 0.3, 0.4, 1]);
		const albedoSampler = result.getProperty("albedoSampler");
		assertStrictEquals(albedoSampler, await getSamplerSpy.calls[0].returned);
		const albedoTexture = result.getProperty("albedoTexture");
		assertStrictEquals(albedoTexture, await getTextureSpy.calls[0].returned);

		assertEquals(result.getProperty("metallicAdjust"), 0.1234);
		assertEquals(result.getProperty("roughnessAdjust"), 0.5678);
		const metallicRoughnessSampler = result.getProperty("metallicRoughnessSampler");
		assertStrictEquals(metallicRoughnessSampler, await getSamplerSpy.calls[1].returned);
		const metallicRoughnessTexture = result.getProperty("metallicRoughnessTexture");
		assertStrictEquals(metallicRoughnessTexture, await getTextureSpy.calls[1].returned);

		assertEquals(result.getProperty("normalScale"), 0.5);
		const normalSampler = result.getProperty("normalSampler");
		assertStrictEquals(normalSampler, await getSamplerSpy.calls[2].returned);
		const normalTexture = result.getProperty("normalTexture");
		assertStrictEquals(normalTexture, await getTextureSpy.calls[2].returned);
	},
});
