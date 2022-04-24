import {assertEquals, assertStrictEquals} from "std/testing/asserts";
import {WebGpuMaterialMapTypeSerializer} from "../../../../../../editor/src/assets/materialMapTypeSerializers/WebGpuMaterialMapTypeSerializer.js";
import {WebGpuPipelineConfigProjectAssetType} from "../../../../../../editor/src/assets/projectAssetType/WebGpuPipelineConfigProjectAssetType.js";
import {ShaderSource, WebGpuPipelineConfig} from "../../../../../../src/mod.js";
import {WebGpuMaterialMapType} from "../../../../../../src/rendering/renderers/webGpu/WebGpuMaterialMapType.js";

const BASIC_FORWARD_PIPELINE_CONFIG_ASSET_UUID = "basic forward pipeline config asset uuid";

function getMockContext({
	getAssetUuidReturnValue = /** @type {string | object} */ (BASIC_FORWARD_PIPELINE_CONFIG_ASSET_UUID),
} = {}) {
	/** @type {{liveAsset: WebGpuPipelineConfig, options: import("../../../../../../editor/src/assets/AssetManager.js").GetLiveAssetFromUuidOrEmbeddedAssetDataOptions<any>}[]} */
	const createdLiveAssets = [];

	const mockMaterialMapAsset = /** @type {unknown} */ ({
		label: "mock material map Asset",
	});
	const materialMapAsset = /** @type {import("../../../../../../editor/src/assets/ProjectAsset.js").ProjectAssetAny} */ (mockMaterialMapAsset);

	const context = /** @type {import("../../../../../../editor/src/assets/materialMapTypeSerializers/MaterialMapTypeSerializer.js").MaterialMapLiveAssetDataContext} */ ({
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
					assertAssetType: WebGpuPipelineConfigProjectAssetType,
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

/**
 * @param {string} shaderSourceStr
 * @param {Object.<string, import("../../../../../../editor/src/assets/materialMapTypeSerializers/MaterialMapTypeSerializer.js").MaterialMapTypeMappableValue>} expectedMappableValues
 */
function testFillMappableValuesForShaderResult(shaderSourceStr, expectedMappableValues) {
	const shaderSource = new ShaderSource(shaderSourceStr);
	/** @type {Map<string, import("../../../../../../editor/src/assets/materialMapTypeSerializers/MaterialMapTypeSerializer.js").MaterialMapTypeMappableValue>} */
	const mappableValues = new Map();

	WebGpuMaterialMapTypeSerializer.fillMappableValuesForShader(shaderSource, mappableValues);

	/** @type {Object.<string, import("../../../../../../editor/src/assets/materialMapTypeSerializers/MaterialMapTypeSerializer.js").MaterialMapTypeMappableValue>} */
	const mappableValuesObj = {};
	for (const [k, v] of mappableValues) {
		mappableValuesObj[k] = v;
	}
	assertEquals(mappableValuesObj, expectedMappableValues);
}

Deno.test({
	name: "fillMappableValuesForShader() with no MaterialUniforms struct",
	fn() {
		testFillMappableValuesForShaderResult("", {});
	},
});

Deno.test({
	name: "fillMappableValuesForShader() with MaterialUniforms struct with no fields",
	fn() {
		testFillMappableValuesForShaderResult(`
struct MaterialUniforms {};
		`, {});
	},
});

Deno.test({
	name: "fillMappableValuesForShader() with MaterialUniforms struct with basic fields",
	fn() {
		testFillMappableValuesForShaderResult(`
struct MaterialUniforms {
	numTest: f32,
	vec2Test : vec2<f32>,
	vec3Test : vec3<f32>,
	vec4Test : vec4<f32>,
};
		`, {
			numTest: {
				name: "numTest",
				type: "number",
			},
			vec2Test: {
				name: "vec2Test",
				type: "vec2",
			},
			vec3Test: {
				name: "vec3Test",
				type: "vec3",
			},
			vec4Test: {
				name: "vec4Test",
				type: "vec4",
			},
		});
	},
});
