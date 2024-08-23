import { assertEquals, assertExists, assertRejects } from "std/testing/asserts.ts";
import { parseJsonData } from "../../../../../../src/util/gltf/parseJsonData.js";
import { getBasicOptions } from "./shared.js";

Deno.test({
	name: "Basic gltf",
	async fn() {
		const { entity } = await parseJsonData({
			asset: { version: "2.0" },
			scenes: [
				{
					name: "My Scene",
					nodes: [0],
				},
			],
			nodes: [
				{
					name: "My object",
				},
			],
		}, getBasicOptions());

		assertExists(entity);
		assertEquals(entity.name, "Entity");
		assertEquals(entity.childCount, 1);
		const scene = entity.children[0];
		assertEquals(scene.name, "My Scene");
		assertEquals(scene.childCount, 1);
		const object = scene.children[0];
		assertEquals(object.name, "My object");
		assertEquals(object.childCount, 0);
	},
});

Deno.test({
	name: "Gltf with unsupported extension",
	async fn() {
		await assertRejects(async () => {
			await parseJsonData({
				asset: { version: "2.0" },
				extensionsRequired: ["unsupported"],
				scenes: [
					{
						name: "My Scene",
						nodes: [0],
					},
				],
				nodes: [
					{
						name: "My object",
					},
				],
			}, getBasicOptions());
		}, Error, 'The glTF requires an unsupported extension: "unsupported".');
	},
});

Deno.test({
	name: "Gltf with supported extension",
	async fn() {
		const options = getBasicOptions();
		options.extensions = [
			{
				name: "supported",
			},
		];
		const { entity } = await parseJsonData({
			asset: { version: "2.0" },
			extensionsRequired: ["supported"],
			scenes: [
				{
					name: "My Scene",
					nodes: [0],
				},
			],
			nodes: [
				{
					name: "My object",
				},
			],
		}, options);
		assertExists(entity);
	},
});
