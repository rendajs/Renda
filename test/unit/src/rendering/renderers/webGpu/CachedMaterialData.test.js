import {assertSpyCall, assertSpyCalls, spy, stub} from "std/testing/mock.ts";
import {CachedMaterialData} from "../../../../../../src/rendering/renderers/webGpu/CachedMaterialData.js";
import {assertEquals, assertExists, assertStrictEquals} from "std/testing/asserts.ts";
import {WebGpuMaterialMapType} from "../../../../../../src/rendering/renderers/webGpu/WebGpuMaterialMapType.js";
import {runWithWebGpu} from "./shared/WebGpuApi.js";

/**
 * @typedef MockPipelineLayout
 * @property {true} isPipelineLayout
 * @property {GPUPipelineLayoutDescriptor} descriptor
 */
function createMocks({
	hasDevice = true,
	hasViewBindGroupLayout = true,
	hasObjectUniformsBindGroupLayout = true,
} = {}) {
	const mockDevice = /** @type {GPUDevice} */ ({
		createBindGroupLayout(descriptor) {
			const layout = {
				isBindGroupLayout: true,
				descriptor,
			};
			return /** @type {GPUBindGroupLayout} */ (/** @type {unknown} */ (layout));
		},
		createPipelineLayout(descriptor) {
			const layout = {
				isPipelineLayout: true,
				descriptor,
			};
			return /** @type {GPUPipelineLayout} */ (/** @type {unknown} */ (layout));
		},
	});
	const mockViewBindGroupLayout = /** @type {GPUBindGroupLayout} */ (/** @type {unknown} */ ({
		isMockViewBindGroupLayout: true,
	}));
	const mockObjectUniformsBindgroupLayout = /** @type {GPUBindGroupLayout} */ (/** @type {unknown} */ ({
		isMockObjectUniformsBindGroupLayout: true,
	}));
	const mockRenderer = /** @type {import("../../../../../../src/mod.js").WebGpuRenderer} */ ({
		device: hasDevice ? mockDevice : null,
		viewBindGroupLayout: hasViewBindGroupLayout ? mockViewBindGroupLayout : null,
		objectUniformsBindGroupLayout: hasObjectUniformsBindGroupLayout ? mockObjectUniformsBindgroupLayout : null,
	});
	const mockMaterial = /** @type {import("../../../../../../src/mod.js").Material} */ ({
		*getMappedPropertiesForMapType(mapType) {},
	});
	return {
		mockRenderer,
		mockDevice,
		mockMaterial,
	};
}

Deno.test({
	name: "The uniforms BindGroupLayout is created and cached",
	fn() {
		runWithWebGpu(() => {
			const {mockRenderer, mockDevice, mockMaterial} = createMocks();
			const createBindGroupLayoutSpy = spy(mockDevice, "createBindGroupLayout");
			const cachedData = new CachedMaterialData(mockRenderer, mockMaterial);

			const layout1 = cachedData.getUniformsBindGroupLayout();
			assertSpyCalls(createBindGroupLayoutSpy, 1);
			assertSpyCall(createBindGroupLayoutSpy, 0, {
				args: [
					{
						label: "materialUniformsBufferBindGroupLayout",
						entries: [
							{
								binding: 0,
								visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
								buffer: {
									hasDynamicOffset: true,
									type: "uniform",
								},
							},
						],
					},
				],
			});

			const layout2 = cachedData.getUniformsBindGroupLayout();
			assertSpyCalls(createBindGroupLayoutSpy, 1);
			assertStrictEquals(layout1, layout2);
		});
	},
});

Deno.test({
	name: "getForwardPipelineConfig() is null without a configured pipeline config",
	fn() {
		runWithWebGpu(() => {
			const {mockRenderer} = createMocks();

			const mockMaterial1 = /** @type {import("../../../../../../src/mod.js").Material} */ ({});
			const cachedData1 = new CachedMaterialData(mockRenderer, mockMaterial1);
			assertEquals(cachedData1.getForwardPipelineConfig(), null);

			const mockMaterial2 = /** @type {import("../../../../../../src/mod.js").Material} */ ({
				materialMap: {
					getMapTypeInstance(mapType) {
						return null;
					},
				},
			});
			const cachedData2 = new CachedMaterialData(mockRenderer, mockMaterial2);
			assertEquals(cachedData2.getForwardPipelineConfig(), null);
		});
	},
});

Deno.test({
	name: "getForwardPipelineConfig() is created and cached",
	fn() {
		runWithWebGpu(() => {
			const {mockRenderer} = createMocks();

			const mockPipelineConfig = /** @type {import("../../../../../../src/mod.js").WebGpuPipelineConfig} */ ({});
			const mockmaterialMap = /** @type {import("../../../../../../src/rendering/MaterialMap.js").MaterialMap} */ ({
				getMapTypeInstance(mapType) {
					const castConstructor = /** @type {new () => any} */ (WebGpuMaterialMapType);
					if (mapType === castConstructor) {
						return new WebGpuMaterialMapType({forwardPipelineConfig: mockPipelineConfig});
					}
					return null;
				},
			});
			const mockMaterial = /** @type {import("../../../../../../src/mod.js").Material} */ ({
				materialMap: mockmaterialMap,
			});
			const getInstanceSpy = spy(mockmaterialMap, "getMapTypeInstance");
			const cachedData = new CachedMaterialData(mockRenderer, mockMaterial);
			assertStrictEquals(cachedData.getForwardPipelineConfig(), mockPipelineConfig);
			assertSpyCalls(getInstanceSpy, 1);

			// Calling it a second time should return the cached value
			assertStrictEquals(cachedData.getForwardPipelineConfig(), mockPipelineConfig);
			assertSpyCalls(getInstanceSpy, 1);
		});
	},
});

Deno.test({
	name: "getPipelineLayout() is null when there is no device",
	fn() {
		runWithWebGpu(() => {
			const {mockMaterial, mockRenderer} = createMocks({hasDevice: false});

			const cachedData = new CachedMaterialData(mockRenderer, mockMaterial);
			assertEquals(cachedData.getPipelineLayout(), null);
		});
	},
});

Deno.test({
	name: "getPipelineLayout() is null when there is no viewBindGroupLayout",
	fn() {
		runWithWebGpu(() => {
			const {mockMaterial, mockRenderer} = createMocks({hasViewBindGroupLayout: false});

			const cachedData = new CachedMaterialData(mockRenderer, mockMaterial);
			assertEquals(cachedData.getPipelineLayout(), null);
		});
	},
});

Deno.test({
	name: "getPipelineLayout() is null when there is no objectUniformsBindGroupLayout",
	fn() {
		runWithWebGpu(() => {
			const {mockMaterial, mockRenderer} = createMocks({hasObjectUniformsBindGroupLayout: false});

			const cachedData = new CachedMaterialData(mockRenderer, mockMaterial);
			assertEquals(cachedData.getPipelineLayout(), null);
		});
	},
});

Deno.test({
	name: "getPipelineLayout() is null when there is no material uniforms bind group layout",
	fn() {
		runWithWebGpu(() => {
			const {mockMaterial, mockRenderer} = createMocks();

			const cachedData = new CachedMaterialData(mockRenderer, mockMaterial);
			stub(cachedData, "getUniformsBindGroupLayout", () => null);
			assertEquals(cachedData.getPipelineLayout(), null);
		});
	},
});

Deno.test({
	name: "getPipelineLayout() is created and cached",
	fn() {
		runWithWebGpu(() => {
			const {mockMaterial, mockDevice, mockRenderer} = createMocks();
			const createPipelineLayoutSpy = spy(mockDevice, "createPipelineLayout");

			const cachedData = new CachedMaterialData(mockRenderer, mockMaterial);
			stub(cachedData, "getUniformsBindGroupLayout", () => {
				return /** @type {GPUBindGroupLayout} */ (/** @type {unknown} */ ({
					isMockMaterialUniformsBindGroupLayout: true,
				}));
			});
			const layout1 = cachedData.getPipelineLayout();
			assertSpyCalls(createPipelineLayoutSpy, 1);
			assertExists(layout1);
			const castPipelineLayout = /** @type {MockPipelineLayout} */ (/** @type {unknown} */ (layout1));
			const castBindGroupLayouts = /** @type {GPUBindGroupLayout[]} */ (/** @type {unknown[]} */ ([
				{
					isMockViewBindGroupLayout: true,
				},
				{
					isMockMaterialUniformsBindGroupLayout: true,
				},
				{
					isMockObjectUniformsBindGroupLayout: true,
				},
			]));
			assertEquals(castPipelineLayout, {
				isPipelineLayout: true,
				descriptor: {
					label: "default pipeline layout",
					bindGroupLayouts: castBindGroupLayouts,
				},
			});

			const layout2 = cachedData.getPipelineLayout();
			assertStrictEquals(layout1, layout2);
			assertSpyCalls(createPipelineLayoutSpy, 1);
		});
	},
});
