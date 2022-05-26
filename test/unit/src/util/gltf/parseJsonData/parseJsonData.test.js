import {assertEquals, assertExists} from "std/testing/asserts";
import {parseJsonData} from "../../../../../../src/util/gltf/parseJsonData.js";

Deno.test({
	name: "Basic gltf",
	async fn() {
		const {entity} = await parseJsonData({
			asset: {version: "2.0"},
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
		});

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
