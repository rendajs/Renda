import { assertAlmostEquals, assertEquals, assertInstanceOf, assertRejects } from "std/testing/asserts.ts";
import { CLUSTER_BOUNDS_SHADER_ASSET_UUID, CLUSTER_LIGHTS_SHADER_ASSET_UUID, CameraComponent, ClusteredLightsConfig, CustomMaterialData, Entity, Mat4, Material, MaterialMap, Mesh, MeshComponent, RenderOutputConfig, ShaderSource, VertexState, WebGpuMaterialMapType, WebGpuPipelineConfig, WebGpuRenderer, assertMatAlmostEquals, createCube } from "../../../../../../src/mod.js";
import { WebGpuChunkedBufferGroup } from "../../../../../../src/rendering/renderers/webGpu/bufferHelper/WebGpuChunkedBufferGroup.js";
import { assertIsType, testTypes } from "../../../../shared/typeAssertions.js";
import { getInstalledMockGpu, runWithWebGpuAsync } from "./shared/WebGpuApi.js";
import { WebGpuRendererError } from "../../../../../../src/rendering/renderers/webGpu/WebGpuRendererError.js";
import { assertSpyCalls, spy } from "std/testing/mock.ts";

function createMockEngineAssetsManager() {
	return /** @type {import("../../../../../../src/mod.js").EngineAssetsManager} */ ({
		watchAsset(uuid, options, onAssetChangeCb) {
			if (uuid == CLUSTER_BOUNDS_SHADER_ASSET_UUID || uuid == CLUSTER_LIGHTS_SHADER_ASSET_UUID) {
				const source = /** @type {any} */ (new ShaderSource(""));
				onAssetChangeCb(source);
			}
		},
	});
}

function createMockDomTarget() {
	return /** @type {import("../../../../../../src/rendering/renderers/webGpu/WebGpuRendererDomTarget.js").WebGpuRendererDomTarget} */ ({
		ready: true,
		swapChainFormat: "rgba8unorm",
		width: 128,
		height: 256,
		outputConfig: new RenderOutputConfig(),
		getRenderPassDescriptor() {
			return {
				colorAttachments: /** @type {Iterable<GPURenderPassColorAttachment | null>} */ ([
					{
						view: /** @type {GPUTextureView} */ ({}),
						resolveTarget: /** @type {GPUTextureView} */ ({}),
						loadOp: "clear",
						clearValue: { r: 0, g: 0, b: 0, a: 1 },
						storeOp: "store",
					},
				]),
			};
		},
	});
}

function createCam() {
	const cam = new Entity();
	const camComponent = cam.addComponent(CameraComponent);
	camComponent.clusteredLightsConfig = new ClusteredLightsConfig();
	return { camComponent, cam };
}

function createVertexState() {
	const vertexState = new VertexState({
		buffers: [
			{
				stepMode: "vertex",
				arrayStride: 12,
				attributes: [
					{
						attributeType: Mesh.AttributeType.POSITION,
						componentCount: 3,
						format: Mesh.AttributeFormat.FLOAT32,
						unsigned: false,
					},
				],
			},
			{
				stepMode: "vertex",
				arrayStride: 16,
				attributes: [
					{
						attributeType: Mesh.AttributeType.COLOR,
						componentCount: 4,
						format: Mesh.AttributeFormat.FLOAT32,
						unsigned: false,
					},
				],
			},
		],
	});
	return vertexState;
}

function createMaterial() {
	const material = new Material();
	const materialMapType = new WebGpuMaterialMapType();
	const pipelineConfig = new WebGpuPipelineConfig();
	pipelineConfig.vertexShader = new ShaderSource("");
	pipelineConfig.fragmentShader = new ShaderSource("");
	materialMapType.forwardPipelineConfig = pipelineConfig;
	const materialMap = new MaterialMap({
		materialMapTypes: [
			{
				mapType: materialMapType,
				mappedValues: {},
			},
		],
	});
	material.setMaterialMap(materialMap);
	return { material };
}

/**
 * @param {DataView} dataView
 */
function extractMatrixFromDataView(dataView, offset = 0) {
	const arr = [];
	for (let i = 0; i < 16; i++) {
		const value = dataView.getFloat32(offset + i * 4, true);
		arr.push(value);
	}
	return arr;
}

testTypes({
	name: "CustomMaterialData callback arguments have the correct types",
	fn() {
		const engineAssetsManager = createMockEngineAssetsManager();
		const renderer = new WebGpuRenderer(engineAssetsManager);
		const customData = new CustomMaterialData();
		customData.registerCallback(renderer, (group) => {
			// Verify that the type is a string and nothing else
			const realGroup = new WebGpuChunkedBufferGroup();
			assertIsType(realGroup, group);

			// @ts-expect-error Verify that the type isn't 'any'
			assertIsType(true, group);
		});
	},
});

Deno.test({
	name: "init throws when there is no available gpu adapter",
	async fn() {
		await runWithWebGpuAsync(async () => {
			const engineAssetsManager = createMockEngineAssetsManager();
			const gpu = getInstalledMockGpu();
			gpu.setMockAdapterEnabled(false);
			const renderer = new WebGpuRenderer(engineAssetsManager);
			await assertRejects(async () => {
				await renderer.init();
			}, WebGpuRendererError, "No GPU adapter was available at this time.");
		});
	},
});

Deno.test({
	name: "render() an empty scene",
	async fn() {
		await runWithWebGpuAsync(async () => {
			const engineAssetsManager = createMockEngineAssetsManager();
			const gpu = getInstalledMockGpu();
			const renderer = new WebGpuRenderer(engineAssetsManager);
			await renderer.init();
			const device = gpu.assertHasSingleDevice();
			const writeBufferSpy = spy(device.queue, "writeBuffer");

			const domTarget = createMockDomTarget();
			const { camComponent } = createCam();
			renderer.render(domTarget, camComponent);

			// Even though they're not needed, uniform and light buffers are written anyway.
			// We may change this in the future.
			assertSpyCalls(writeBufferSpy, 2);
			assertEquals(writeBufferSpy.calls[0].args[0].label, "viewUniforms-chunk0");
			assertEquals(writeBufferSpy.calls[1].args[0].label, "lights-chunk0");
		});
	},
});

Deno.test({
	name: "view uniforms buffer gets the correct data",
	async fn() {
		await runWithWebGpuAsync(async () => {
			const engineAssetsManager = createMockEngineAssetsManager();
			const gpu = getInstalledMockGpu();
			const renderer = new WebGpuRenderer(engineAssetsManager);
			await renderer.init();
			const device = gpu.assertHasSingleDevice();
			const writeBufferSpy = spy(device.queue, "writeBuffer");

			const domTarget = createMockDomTarget();
			const scene = new Entity();
			const { camComponent, cam } = createCam();
			cam.pos.set(1, 2, 3);
			scene.add(cam);

			const vertexState = createVertexState();
			const cubeEntity = scene.add(new Entity("cube"));
			const meshComponent = cubeEntity.addComponent(MeshComponent);
			meshComponent.mesh = createCube({ vertexState });
			const { material } = createMaterial();
			meshComponent.materials = [material];

			renderer.render(domTarget, camComponent);

			assertEquals(writeBufferSpy.calls[0].args[0].label, "viewUniforms-chunk0");
			const viewUniformsBuffer = writeBufferSpy.calls[0].args[2];
			assertInstanceOf(viewUniformsBuffer, ArrayBuffer);
			const view = new DataView(viewUniformsBuffer);

			const screenWidth = view.getFloat32(0, true);
			assertEquals(screenWidth, 128);
			const screenHeight = view.getFloat32(4, true);
			assertEquals(screenHeight, 256);
			const unused1 = view.getFloat32(8, true);
			assertEquals(unused1, 0);
			const unused2 = view.getFloat32(12, true);
			assertEquals(unused2, 0);

			const camPosX = view.getFloat32(16, true);
			assertEquals(camPosX, 1);
			const camPosY = view.getFloat32(20, true);
			assertEquals(camPosY, 2);
			const camPosZ = view.getFloat32(24, true);
			assertEquals(camPosZ, 3);
			const unused3 = view.getFloat32(28, true);
			assertEquals(unused3, 0);

			const projectionMatrix = extractMatrixFromDataView(view, 32);
			assertMatAlmostEquals(projectionMatrix, camComponent.projectionMatrix);

			const inverseProjectionMatrix = extractMatrixFromDataView(view, 96);
			assertMatAlmostEquals(inverseProjectionMatrix, camComponent.projectionMatrix.inverse());

			const expectedViewMatrix = cam.worldMatrix.inverse();
			const viewMatrix = extractMatrixFromDataView(view, 160);
			assertMatAlmostEquals(viewMatrix, expectedViewMatrix);

			const viewProjectionMatrix = extractMatrixFromDataView(view, 224);
			assertMatAlmostEquals(viewProjectionMatrix, Mat4.multiplyMatrices(expectedViewMatrix, camComponent.projectionMatrix));

			const clipNear = view.getFloat32(288, true);
			assertAlmostEquals(clipNear, 0.1);
			const clipFar = view.getFloat32(292, true);
			assertAlmostEquals(clipFar, 1000);
			const unused4 = view.getFloat32(296, true);
			assertEquals(unused4, 0);
			const unused5 = view.getFloat32(300, true);
			assertEquals(unused5, 0);
		});
	},
});

Deno.test({
	name: "object uniforms buffer gets the correct data",
	async fn() {
		await runWithWebGpuAsync(async () => {
			const engineAssetsManager = createMockEngineAssetsManager();
			const gpu = getInstalledMockGpu();
			const renderer = new WebGpuRenderer(engineAssetsManager);
			await renderer.init();
			const device = gpu.assertHasSingleDevice();
			const writeBufferSpy = spy(device.queue, "writeBuffer");

			const domTarget = createMockDomTarget();
			const scene = new Entity();
			const { camComponent, cam } = createCam();
			cam.pos.set(1, 2, 3);
			scene.add(cam);

			const vertexState = createVertexState();
			const cubeEntity = scene.add(new Entity("cube"));
			cubeEntity.pos.set(4, 5, 6);
			const meshComponent = cubeEntity.addComponent(MeshComponent);
			meshComponent.mesh = createCube({ vertexState });
			const { material } = createMaterial();
			meshComponent.materials = [material];

			renderer.render(domTarget, camComponent);

			assertEquals(writeBufferSpy.calls[3].args[0].label, "objectUniforms-chunk0");
			const viewUniformsBuffer = writeBufferSpy.calls[3].args[2];
			assertInstanceOf(viewUniformsBuffer, ArrayBuffer);
			const view = new DataView(viewUniformsBuffer);

			const expectedViewMatrix = cam.worldMatrix.inverse();
			const expectedViewProjectionMatrix = Mat4.multiplyMatrices(expectedViewMatrix, camComponent.projectionMatrix);
			const expectedMvpMatrix = Mat4.multiplyMatrices(cubeEntity.worldMatrix, expectedViewProjectionMatrix);
			const mvpMatrix = extractMatrixFromDataView(view, 0);
			assertMatAlmostEquals(mvpMatrix, expectedMvpMatrix);

			const worldMatrix = extractMatrixFromDataView(view, 64);
			assertMatAlmostEquals(worldMatrix, cubeEntity.worldMatrix);
		});
	},
});
