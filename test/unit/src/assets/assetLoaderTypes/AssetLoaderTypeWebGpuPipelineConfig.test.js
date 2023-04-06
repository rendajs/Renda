import {assertEquals, assertInstanceOf, assertStrictEquals} from "std/testing/asserts.ts";
import {AssetLoaderTypeWebGpuPipelineConfig, WebGpuPipelineConfig} from "../../../../../src/mod.js";
import {ProjectAssetTypeWebGpuPipelineConfig} from "../../../../../studio/src/assets/projectAssetType/ProjectAssetTypeWebGpuPipelineConfig.js";
import {serializeAndLoad} from "./shared.js";

Deno.test({
	name: "Loading the defaults",
	async fn() {
		const result = await serializeAndLoad({
			ProjectAssetTypeConstructor: ProjectAssetTypeWebGpuPipelineConfig,
			AssetLoaderType: AssetLoaderTypeWebGpuPipelineConfig,
			jsonFileData: {},
		});

		assertEquals(result.referencedAssetUuids, [null, null]);
		const config = result.loadResult;
		assertInstanceOf(config, WebGpuPipelineConfig);
		assertEquals(config.fragmentShader, null);
		assertEquals(config.vertexShader, null);
		assertEquals(config.primitiveTopology, "triangle-list");
		assertEquals(config.depthCompareFunction, "less");
		assertEquals(config.depthWriteEnabled, true);
		assertEquals(config.blendState, undefined);
		assertEquals(config.renderOrder, 0);
	},
});

Deno.test({
	name: "Loading a custom config",
	async fn() {
		const VERTEX_UUID = "00000000-0000-0000-0000-000000000001";
		const FRAGMENT_UUID = "00000000-0000-0000-0000-000000000002";
		const {referencedAssetUuids, loadResult, getRequestedAsset} = await serializeAndLoad({
			ProjectAssetTypeConstructor: ProjectAssetTypeWebGpuPipelineConfig,
			AssetLoaderType: AssetLoaderTypeWebGpuPipelineConfig,
			jsonFileData: {
				asset: {
					vertexShader: VERTEX_UUID,
					fragmentShader: FRAGMENT_UUID,
					primitiveTopology: "triangle-strip",
				},
			},
		});

		assertEquals(referencedAssetUuids, [VERTEX_UUID, FRAGMENT_UUID]);
		assertInstanceOf(loadResult, WebGpuPipelineConfig);
		assertStrictEquals(loadResult.fragmentShader, getRequestedAsset(FRAGMENT_UUID));
		assertStrictEquals(loadResult.vertexShader, getRequestedAsset(VERTEX_UUID));
		assertEquals(loadResult.primitiveTopology, "triangle-strip");
	},
});
