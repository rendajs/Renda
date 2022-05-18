import {assertEquals, assertStrictEquals} from "std/testing/asserts";
import {WebGpuMaterialMapTypeSerializer} from "../../../../../../../editor/src/assets/materialMapTypeSerializers/WebGpuMaterialMapTypeSerializer.js";
import {WebGpuPipelineConfig} from "../../../../../../../src/mod.js";
import {WebGpuMaterialMapType} from "../../../../../../../src/rendering/renderers/webGpu/WebGpuMaterialMapType.js";
import {createMockProjectAsset} from "../../shared/createMockProjectAsset.js";
import {assertSpyCall, assertSpyCalls, spy, stub} from "std/testing/mock";

const BASIC_FORWARD_PIPELINE_CONFIG_ASSET_UUID = "basic forward pipeline config asset uuid";

function getMockContext({
	getAssetUuidReturnValue = /** @type {string | object} */ (BASIC_FORWARD_PIPELINE_CONFIG_ASSET_UUID),
} = {}) {
	const {projectAsset: materialMapAsset} = createMockProjectAsset();

	const pipelineConfig = new WebGpuPipelineConfig();
	const {projectAsset: pipeLineConfigAsset} = createMockProjectAsset({
		liveAsset: pipelineConfig,
	});

	const context = /** @type {import("../../../../../../../editor/src/assets/materialMapTypeSerializers/MaterialMapTypeSerializer.js").MaterialMapLiveAssetDataContext} */ ({
		materialMapAsset,
		assetManager: {
			async getProjectAssetFromUuidOrEmbeddedAssetData(uuidOrData, options) {
				if (uuidOrData === BASIC_FORWARD_PIPELINE_CONFIG_ASSET_UUID) {
					return pipeLineConfigAsset;
				}
			},
			async getLiveAssetFromUuidOrEmbeddedAssetData(uuidOrData, options) {
				if (uuidOrData === BASIC_FORWARD_PIPELINE_CONFIG_ASSET_UUID) {
					return pipelineConfig;
				}
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
		const {context, pipelineConfig, materialMapAsset, pipeLineConfigAsset} = getMockContext();

		const mockProjectAssetType = /** @type {import("../../../../../../../editor/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny} */ ({
			listenForUsedLiveAssetChanges(projectAsset) {},
		});
		const listenForUsedLiveAssetChangesSpy = spy(mockProjectAssetType, "listenForUsedLiveAssetChanges");

		stub(materialMapAsset, "getProjectAssetType", async () => {
			return mockProjectAssetType;
		});

		const result = await WebGpuMaterialMapTypeSerializer.loadLiveAssetData(context, {
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
		/** @type {import("../../../../../../../editor/src/assets/projectAssetType/WebGpuPipelineConfigProjectAssetType.js").WebGpuPipelineConfigAssetData} */
		const pipelineConfigData = {
			depthWriteEnabled: true,
			renderOrder: 123,
		};
		const {context} = getMockContext({
			getAssetUuidReturnValue: pipelineConfigData,
		});
		const forwardPipelineConfig = new WebGpuPipelineConfig();
		const liveAsset = new WebGpuMaterialMapType({forwardPipelineConfig});

		const result = await WebGpuMaterialMapTypeSerializer.saveLiveAssetData(context, liveAsset);

		assertEquals(result, {
			forwardPipelineConfig: pipelineConfigData,
		});
	},
});
