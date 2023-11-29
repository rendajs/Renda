import {assertEquals, assertStrictEquals} from "std/testing/asserts.ts";
import {MaterialMapTypeSerializerWebGpu} from "../../../../../../studio/src/assets/materialMapTypeSerializers/MaterialMapTypeSerializerWebGpu.js";
import {WebGpuPipelineConfig} from "../../../../../../src/mod.js";
import {WebGpuMaterialMapType} from "../../../../../../src/rendering/renderers/webGpu/WebGpuMaterialMapType.js";
import {createMockProjectAsset} from "../../../shared/createMockProjectAsset.js";
import {assertSpyCall, assertSpyCalls, spy, stub} from "std/testing/mock.ts";

const BASIC_FORWARD_PIPELINE_CONFIG_ASSET_UUID = "basic forward pipeline config asset uuid";

function getMockContext({
	getAssetUuidReturnValue = /** @type {string | object} */ (BASIC_FORWARD_PIPELINE_CONFIG_ASSET_UUID),
} = {}) {
	const {projectAsset: materialMapAsset} = createMockProjectAsset();

	const pipelineConfig = new WebGpuPipelineConfig();
	const {projectAsset: pipeLineConfigAsset} = createMockProjectAsset({
		liveAsset: pipelineConfig,
	});

	const context = /** @type {import("../../../../../../studio/src/assets/materialMapTypeSerializers/MaterialMapTypeSerializer.js").MaterialMapLiveAssetDataContext} */ ({
		materialMapAsset,
		assetManager: {
			async getProjectAssetFromUuidOrEmbeddedAssetData(uuidOrData, options) {
				if (uuidOrData === BASIC_FORWARD_PIPELINE_CONFIG_ASSET_UUID) {
					return pipeLineConfigAsset;
				}
				return null;
			},
			async getLiveAssetFromUuidOrEmbeddedAssetData(uuidOrData, options) {
				if (uuidOrData === BASIC_FORWARD_PIPELINE_CONFIG_ASSET_UUID) {
					return pipelineConfig;
				}
				return null;
			},
			getAssetUuidOrEmbeddedAssetDataFromLiveAsset(liveAsset) {
				return getAssetUuidReturnValue;
			},
		},
	});
	return {
		context,
		pipelineConfig,
		pipeLineConfigAsset,
		materialMapAsset,
	};
}

Deno.test({
	name: "loadLiveAssetData() with no data",
	async fn() {
		const {context} = getMockContext();
		const result = await MaterialMapTypeSerializerWebGpu.loadLiveAssetData(context, null);
		assertEquals(result.forwardPipelineConfig, null);
	},
});

Deno.test({
	name: "loadLiveAssetData() with an empty object",
	async fn() {
		const {context} = getMockContext();
		const result = await MaterialMapTypeSerializerWebGpu.loadLiveAssetData(context, {});
		assertEquals(result.forwardPipelineConfig, null);
	},
});

Deno.test({
	name: "loadLiveAssetData() with a forwardPipelineConfig uuid",
	async fn() {
		const {context, pipelineConfig, materialMapAsset, pipeLineConfigAsset} = getMockContext();

		const mockProjectAssetType = /** @type {import("../../../../../../studio/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny} */ ({
			listenForUsedLiveAssetChanges(projectAsset) {},
		});
		const listenForUsedLiveAssetChangesSpy = spy(mockProjectAssetType, "listenForUsedLiveAssetChanges");

		stub(materialMapAsset, "getProjectAssetType", async () => {
			return mockProjectAssetType;
		});

		const result = await MaterialMapTypeSerializerWebGpu.loadLiveAssetData(context, {
			forwardPipelineConfig: BASIC_FORWARD_PIPELINE_CONFIG_ASSET_UUID,
		});

		assertSpyCalls(listenForUsedLiveAssetChangesSpy, 1);
		assertSpyCall(listenForUsedLiveAssetChangesSpy, 0, {
			args: [pipeLineConfigAsset],
		});
		assertStrictEquals(listenForUsedLiveAssetChangesSpy.calls[0].args[0], pipeLineConfigAsset);

		assertStrictEquals(result.forwardPipelineConfig, pipelineConfig);
	},
});

Deno.test({
	name: "saveLiveAssetData() with no forwardPipelineConfig",
	async fn() {
		const {context} = getMockContext();
		const liveAsset = new WebGpuMaterialMapType();

		const result = await MaterialMapTypeSerializerWebGpu.saveLiveAssetData(context, liveAsset);

		assertEquals(result, {});
	},
});

Deno.test({
	name: "saveLiveAssetData() with a forwardPipelineConfig",
	async fn() {
		const {context} = getMockContext();
		const forwardPipelineConfig = new WebGpuPipelineConfig();
		const liveAsset = new WebGpuMaterialMapType({forwardPipelineConfig});

		const result = await MaterialMapTypeSerializerWebGpu.saveLiveAssetData(context, liveAsset);

		assertEquals(result, {
			forwardPipelineConfig: BASIC_FORWARD_PIPELINE_CONFIG_ASSET_UUID,
		});
	},
});

Deno.test({
	name: "saveLiveAssetData() with an embedded forwardPipelineConfig",
	async fn() {
		/** @type {import("../../../../../../studio/src/assets/projectAssetType/ProjectAssetTypeWebGpuPipelineConfig.js").WebGpuPipelineConfigAssetData} */
		const pipelineConfigData = {
			depthWriteEnabled: true,
			renderOrder: 123,
		};
		const {context} = getMockContext({
			getAssetUuidReturnValue: pipelineConfigData,
		});
		const forwardPipelineConfig = new WebGpuPipelineConfig();
		const liveAsset = new WebGpuMaterialMapType({forwardPipelineConfig});

		const result = await MaterialMapTypeSerializerWebGpu.saveLiveAssetData(context, liveAsset);

		assertEquals(result, {
			forwardPipelineConfig: pipelineConfigData,
		});
	},
});

Deno.test({
	name: "getMappableValues()",
	async fn() {
		const {context, pipelineConfig} = getMockContext();
		pipelineConfig.fragmentShader = {
			source: `
				struct MaterialUniforms {
					numTest:f32,
					vec2Test: vec2<f32>,
					vec3Test :vec3<f32>,
					vec4Test : vec4<f32>,
					customTest: CustomStruct,
				};

				struct CustomStruct {
					foo: f32,
				};

				@group(1) @binding(1) var albedoSampler : sampler;
				@group(1) @binding(2) var albedoTexture : texture_2d<f32>;

				// invalid group value
				@group(2) @binding(3) var invalidSampler : sampler;
			`,
		};
		const result = await MaterialMapTypeSerializerWebGpu.getMappableValues(context, {
			forwardPipelineConfig: BASIC_FORWARD_PIPELINE_CONFIG_ASSET_UUID,
		});
		assertEquals(result, [
			{
				name: "numTest",
				type: "number",
			},
			{
				name: "vec2Test",
				type: "vec2",
			},
			{
				name: "vec3Test",
				type: "vec3",
			},
			{
				name: "vec4Test",
				type: "vec4",
			},
			{
				name: "customTest",
				type: "custom",
			},
			{
				name: "albedoSampler",
				type: "sampler",
			},
			{
				name: "albedoTexture",
				type: "texture2d",
			},
		]);
	},
});
