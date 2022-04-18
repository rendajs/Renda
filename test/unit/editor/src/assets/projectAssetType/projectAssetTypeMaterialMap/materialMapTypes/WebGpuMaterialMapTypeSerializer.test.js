import {assertEquals, assertStrictEquals} from "asserts";
import {WebGpuMaterialMapTypeSerializer} from "../../../../../../../../editor/src/assets/projectAssetType/projectAssetTypeMaterialMap/materialMapTypes/WebGpuMaterialMapTypeSerializer.js";
import {ProjectAssetTypeWebGpuPipelineConfig} from "../../../../../../../../editor/src/assets/projectAssetType/ProjectAssetTypeWebGpuPipelineConfig.js";
import {WebGpuPipelineConfig} from "../../../../../../../../src/mod.js";
import {WebGpuMaterialMapType} from "../../../../../../../../src/rendering/renderers/webGpu/WebGpuMaterialMapType.js";

const BASIC_FORWARD_PIPELINE_CONFIG_ASSET_UUID = "basic forward pipeline config asset uuid";

function getMockContext({
	getAssetUuidReturnValue = /** @type {string | object} */ (BASIC_FORWARD_PIPELINE_CONFIG_ASSET_UUID),
} = {}) {
	/** @type {{liveAsset: WebGpuPipelineConfig, options: import("../../../../../../../../editor/src/assets/AssetManager.js").GetLiveAssetFromUuidOrEmbeddedAssetDataOptions<any>}[]} */
	const createdLiveAssets = [];

	const mockMaterialMapAsset = /** @type {unknown} */ ({
		label: "mock material map Asset",
	});
	const materialMapAsset = /** @type {import("../../../../../../../../editor/src/assets/ProjectAsset.js").ProjectAssetAny} */ (mockMaterialMapAsset);

	const context = /** @type {import("../../../../../../../../editor/src/assets/projectAssetType/projectAssetTypeMaterialMap/materialMapTypes/MaterialMapTypeSerializer.js").MaterialMapLiveAssetDataContext} */ ({
		materialMapAsset,
		assetManager: {
			async getLiveAssetFromUuidOrEmbeddedAssetData(uuidOrData, options) {
				const liveAsset = new WebGpuPipelineConfig();
				createdLiveAssets.push({liveAsset, options});
				return liveAsset;
			},
			getAssetUuidOrEmbeddedAssetDataFromLiveAsset(liveAsset) {
				return getAssetUuidReturnValue;
			},
		},
	});
	return {
		context,
		createdLiveAssets,
		mockMaterialMapAsset,
	};
}

Deno.test({
	name: "loadLiveAssetData() with no data",
	async fn() {
		const {context} = getMockContext();
		const result = await WebGpuMaterialMapTypeSerializer.loadLiveAssetData(context, null);
		assertEquals(result.forwardPipelineConfig, null);
	},
});

Deno.test({
	name: "loadLiveAssetData() with an empty object",
	async fn() {
		const {context} = getMockContext();
		const result = await WebGpuMaterialMapTypeSerializer.loadLiveAssetData(context, {});
		assertEquals(result.forwardPipelineConfig, null);
	},
});

Deno.test({
	name: "loadLiveAssetData() with a forwardPipelineConfig uuid",
	async fn() {
		const {context, createdLiveAssets, mockMaterialMapAsset} = getMockContext();

		const result = await WebGpuMaterialMapTypeSerializer.loadLiveAssetData(context, {
			forwardPipelineConfig: BASIC_FORWARD_PIPELINE_CONFIG_ASSET_UUID,
		});

		assertEquals(createdLiveAssets, [
			{
				liveAsset: result.forwardPipelineConfig,
				options: {
					assertAssetType: ProjectAssetTypeWebGpuPipelineConfig,
					embeddedAssetPersistenceKey: "webgpumaptype.forwardpipelineconfig",
					parentAsset: mockMaterialMapAsset,
				},
			},
		]);
		assertStrictEquals(result.forwardPipelineConfig, createdLiveAssets[0].liveAsset);
		assertStrictEquals(createdLiveAssets[0].options.parentAsset, mockMaterialMapAsset);
	},
});

Deno.test({
	name: "saveLiveAssetData() with no forwardPipelineConfig",
	async fn() {
		const {context} = getMockContext();
		const liveAsset = new WebGpuMaterialMapType();

		const result = await WebGpuMaterialMapTypeSerializer.saveLiveAssetData(context, liveAsset);

		assertEquals(result, {});
	},
});

Deno.test({
	name: "saveLiveAssetData() with a forwardPipelineConfig",
	async fn() {
		const {context} = getMockContext();
		const forwardPipelineConfig = new WebGpuPipelineConfig();
		const liveAsset = new WebGpuMaterialMapType({forwardPipelineConfig});

		const result = await WebGpuMaterialMapTypeSerializer.saveLiveAssetData(context, liveAsset);

		assertEquals(result, {
			forwardPipelineConfig: BASIC_FORWARD_PIPELINE_CONFIG_ASSET_UUID,
		});
	},
});

Deno.test({
	name: "saveLiveAssetData() with an embedded forwardPipelineConfig",
	async fn() {
		const {context} = getMockContext({
			getAssetUuidReturnValue: {someData: "some data"},
		});
		const forwardPipelineConfig = new WebGpuPipelineConfig();
		const liveAsset = new WebGpuMaterialMapType({forwardPipelineConfig});

		const result = await WebGpuMaterialMapTypeSerializer.saveLiveAssetData(context, liveAsset);

		assertEquals(result, {
			forwardPipelineConfig: {someData: "some data"},
		});
	},
});
