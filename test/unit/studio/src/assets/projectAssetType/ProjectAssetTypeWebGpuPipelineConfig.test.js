import { assertEquals, assertInstanceOf, assertStrictEquals } from "std/testing/asserts.ts";
import { AssetLoaderTypeWebGpuPipelineConfig, WebGpuPipelineConfig } from "../../../../../../src/mod.js";
import { ProjectAssetTypeWebGpuPipelineConfig } from "../../../../../../studio/src/assets/projectAssetType/ProjectAssetTypeWebGpuPipelineConfig.js";
import { createMockDependencies, serializeAndLoad } from "./shared.js";

/**
 * @param {unknown} pipelineConfig
 */
function assertDefaults(pipelineConfig) {
	assertInstanceOf(pipelineConfig, WebGpuPipelineConfig);
	assertEquals(pipelineConfig.fragmentShader, null);
	assertEquals(pipelineConfig.vertexShader, null);
	assertEquals(pipelineConfig.primitiveTopology, "triangle-list");
	assertEquals(pipelineConfig.depthCompareFunction, "less");
	assertEquals(pipelineConfig.depthWriteEnabled, true);

	// TODO: #509 we want this to be undefined in the future,
	// but for now the full default value is being serialized/deserialized.
	// assertEquals(pipelineConfig.blend, undefined);
}

Deno.test({
	name: "getLiveAssetData() with an empty object",
	async fn() {
		const { projectAssetTypeArgs } = createMockDependencies();
		const projectAssetType = new ProjectAssetTypeWebGpuPipelineConfig(...projectAssetTypeArgs);
		const { liveAsset, studioData } = await projectAssetType.getLiveAssetData({});

		assertEquals(studioData, null);

		assertDefaults(liveAsset);
		assertEquals(liveAsset.blend, undefined);
	},
});

Deno.test({
	name: "Serializing and loading the defaults",
	async fn() {
		const result = await serializeAndLoad({
			ProjectAssetTypeConstructor: ProjectAssetTypeWebGpuPipelineConfig,
			AssetLoaderType: AssetLoaderTypeWebGpuPipelineConfig,
			jsonFileData: {},
		});

		assertEquals(result.referencedAssetUuids, [null, null]);
		const config = result.loadResult;
		assertDefaults(config);
		assertEquals(config.renderOrder, 0);
	},
});

Deno.test({
	name: "primitiveTopology is serialized and loaded",
	async fn() {
		const { loadResult } = await serializeAndLoad({
			ProjectAssetTypeConstructor: ProjectAssetTypeWebGpuPipelineConfig,
			AssetLoaderType: AssetLoaderTypeWebGpuPipelineConfig,
			jsonFileData: {
				asset: {
					primitiveTopology: "triangle-strip",
				},
			},
		});

		assertInstanceOf(loadResult, WebGpuPipelineConfig);
		assertEquals(loadResult.primitiveTopology, "triangle-strip");
	},
});

Deno.test({
	name: "getLiveAssetData() with primitiveTopology",
	async fn() {
		const { projectAssetTypeArgs } = createMockDependencies();
		const projectAssetType = new ProjectAssetTypeWebGpuPipelineConfig(...projectAssetTypeArgs);
		const { liveAsset } = await projectAssetType.getLiveAssetData({
			primitiveTopology: "triangle-strip",
		});

		assertInstanceOf(liveAsset, WebGpuPipelineConfig);
		assertEquals(liveAsset.primitiveTopology, "triangle-strip");
	},
});

const VERTEX_UUID = "00000000-0000-0000-0000-000000000001";
const FRAGMENT_UUID = "00000000-0000-0000-0000-000000000002";

Deno.test({
	name: "Shader uuids are serialized and loaded",
	async fn() {
		const { referencedAssetUuids, loadResult, getRequestedAsset } = await serializeAndLoad({
			ProjectAssetTypeConstructor: ProjectAssetTypeWebGpuPipelineConfig,
			AssetLoaderType: AssetLoaderTypeWebGpuPipelineConfig,
			jsonFileData: {
				asset: {
					vertexShader: VERTEX_UUID,
					fragmentShader: FRAGMENT_UUID,
				},
			},
		});

		assertEquals(referencedAssetUuids, [VERTEX_UUID, FRAGMENT_UUID]);
		assertInstanceOf(loadResult, WebGpuPipelineConfig);
		assertStrictEquals(loadResult.fragmentShader, getRequestedAsset(FRAGMENT_UUID));
		assertStrictEquals(loadResult.vertexShader, getRequestedAsset(VERTEX_UUID));
	},
});

Deno.test({
	name: "blendState is serialized and loaded",
	async fn() {
		const { loadResult } = await serializeAndLoad({
			ProjectAssetTypeConstructor: ProjectAssetTypeWebGpuPipelineConfig,
			AssetLoaderType: AssetLoaderTypeWebGpuPipelineConfig,
			jsonFileData: {
				asset: {
					blend: {
						color: {
							srcFactor: "src-alpha",
						},
						alpha: {
							dstFactor: "one",
						},
					},
				},
			},
		});

		assertInstanceOf(loadResult, WebGpuPipelineConfig);
		assertEquals(loadResult.blend, {
			color: {
				operation: "add",
				srcFactor: "src-alpha",
				dstFactor: "zero",
			},
			alpha: {
				operation: "add",
				srcFactor: "one",
				dstFactor: "one",
			},
		});
	},
});

Deno.test({
	name: "getLiveAssetData() with blend state",
	async fn() {
		const { projectAssetTypeArgs } = createMockDependencies();
		const projectAssetType = new ProjectAssetTypeWebGpuPipelineConfig(...projectAssetTypeArgs);
		const { liveAsset } = await projectAssetType.getLiveAssetData({
			blend: {
				color: {
					srcFactor: "src-alpha",
					operation: "max",
				},
				alpha: {
					dstFactor: "one",
				},
			},
		});

		assertInstanceOf(liveAsset, WebGpuPipelineConfig);
		assertEquals(liveAsset.blend, {
			color: {
				srcFactor: "src-alpha",
				operation: "max",
			},
			alpha: {
				dstFactor: "one",
			},
		});
	},
});

Deno.test({
	name: "getLiveAssetData() with blend state, missing one component",
	async fn() {
		const { projectAssetTypeArgs } = createMockDependencies();
		const projectAssetType = new ProjectAssetTypeWebGpuPipelineConfig(...projectAssetTypeArgs);
		const { liveAsset } = await projectAssetType.getLiveAssetData({
			blend: {
				color: {
					srcFactor: "src-alpha",
				},
			},
		});

		assertInstanceOf(liveAsset, WebGpuPipelineConfig);
		assertEquals(liveAsset.blend, {
			color: {
				srcFactor: "src-alpha",
			},
			alpha: {},
		});
	},
});
