import {assertEquals, assertRejects, assertStrictEquals} from "std/testing/asserts";
import {Material} from "../../../../../src/rendering/Material.js";
import {MaterialMap} from "../../../../../src/rendering/MaterialMap.js";
import {getMaterialHelper} from "../../../../../src/util/gltf/getMaterial.js";

function basicSetup() {
	/** @type {import("../../../../../src/util/gltf/types.js").GltfJsonData} */
	const jsonData = {
		asset: {version: "2.0"},
		materials: [
			{
				name: "Material 1",
				pbrMetallicRoughness: {
					metallicFactor: 0.1234,
					roughnessFactor: 0.5678,
				},
			},
		],
	};

	/** @type {Map<number, Material>} */
	const materialsCache = new Map();

	const defaultMaterial = new Material();
	const defaultMaterialMap = new MaterialMap();

	return {
		jsonData,
		materialsCache,
		defaultMaterial,
		defaultMaterialMap,
	};
}

Deno.test({
	name: "Returns the default material when the index is undefined",
	async fn() {
		const {jsonData, materialsCache, defaultMaterial, defaultMaterialMap} = basicSetup();
		delete jsonData.materials;
		const result = await getMaterialHelper(jsonData, undefined, materialsCache, {
			defaultMaterial,
			defaultMaterialMap,
		});

		assertStrictEquals(result, defaultMaterial);
	},
});

Deno.test({
	name: "Throws when the material id doesn't exist",
	async fn() {
		const {jsonData, materialsCache, defaultMaterial, defaultMaterialMap} = basicSetup();

		await assertRejects(async () => {
			await getMaterialHelper(jsonData, 12345, materialsCache, {
				defaultMaterial,
				defaultMaterialMap,
			});
		}, Error, "Tried to reference material with index 12345 but it does not exist.");
	},
});

Deno.test({
	name: "Throws when the json doesn't contain materials",
	async fn() {
		const {jsonData, materialsCache, defaultMaterial, defaultMaterialMap} = basicSetup();
		delete jsonData.materials;

		await assertRejects(async () => {
			await getMaterialHelper(jsonData, 12345, materialsCache, {
				defaultMaterial,
				defaultMaterialMap,
			});
		}, Error, "Tried to reference material with index 12345 but it does not exist.");
	},
});

Deno.test({
	name: "Uses cached materials",
	async fn() {
		const {jsonData, materialsCache, defaultMaterial, defaultMaterialMap} = basicSetup();

		const cachedMaterial = new Material();
		materialsCache.set(0, cachedMaterial);

		const result = await getMaterialHelper(jsonData, 0, materialsCache, {
			defaultMaterial,
			defaultMaterialMap,
		});

		assertStrictEquals(result, cachedMaterial);
	},
});

Deno.test({
	name: "Creates pbr materials with the correct properties",
	async fn() {
		const {jsonData, materialsCache, defaultMaterial, defaultMaterialMap} = basicSetup();

		const result = await getMaterialHelper(jsonData, 0, materialsCache, {
			defaultMaterial,
			defaultMaterialMap,
		});

		assertEquals(result.getProperty("metallicAdjust"), 0.1234);
		assertEquals(result.getProperty("roughnessAdjust"), 0.5678);
	},
});
