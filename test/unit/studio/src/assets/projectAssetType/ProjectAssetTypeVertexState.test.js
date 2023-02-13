import {assertEquals} from "std/testing/asserts.ts";
import {ProjectAssetTypeVertexState} from "../../../../../../studio/src/assets/projectAssetType/ProjectAssetTypeVertexState.js";

Deno.test({
	name: "transformBundledAssetData",
	fn() {
		const result = ProjectAssetTypeVertexState.transformBundledAssetData({
			buffers: [
				{
					arrayStride: 1,
					stepMode: "vertex",
					attributes: [
						{
							attributeType: "COLOR",
							format: "FLOAT32",
							unsigned: true,
							componentCount: 3,
							shaderLocation: -1,
						},
					],
				},
			],
		});

		assertEquals(result, {
			buffers: [
				{
					arrayStride: 1,
					stepMode: "vertex",
					attributes: [
						{
							attributeType: 2,
							format: 4,
							unsigned: true,
							componentCount: 3,
							shaderLocation: -1,
						},
					],
				},
			],
		});
	},
});
