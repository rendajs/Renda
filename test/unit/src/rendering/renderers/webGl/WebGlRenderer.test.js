import { assertEquals, assertRejects, assertStrictEquals } from "std/testing/asserts.ts";
import { CustomMaterialData, Entity, Material, MaterialMap, Mesh, ShaderSource, VertexState, WebGlMaterialConfig, WebGlMaterialMapType, WebGlRenderer, WebGlRendererError } from "../../../../../../src/mod.js";
import { assertHasSingleContext, runWithWebGlMocksAsync, setWebGlContextSupported } from "./shared/webGlMocks.js";
import { assertIsType, testTypes } from "../../../../shared/typeAssertions.js";
import { createCam, createCubeEntity } from "../shared/sceneUtil.js";
import { assertLogEntryEquals, assertLogEquals } from "./shared/WebGlCommandLog.js";

async function basicRendererSetup() {
	const renderer = new WebGlRenderer();
	await renderer.init();

	const domTarget = renderer.createDomTarget();
	const { cam, camComponent } = createCam();

	const scene = new Entity();
	scene.add(cam);

	const { commandLog, canvas } = assertHasSingleContext();

	return { renderer, domTarget, camComponent, scene, commandLog, canvas };
}

function createMaterial() {
	const material = new Material();
	const materialMapType = new WebGlMaterialMapType();
	const materialConfig = new WebGlMaterialConfig();
	materialConfig.vertexShader = new ShaderSource("");
	materialConfig.fragmentShader = new ShaderSource("");
	materialMapType.materialConfig = materialConfig;
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

Deno.test({
	name: "Throws when WebGL isn't supported",
	async fn() {
		await runWithWebGlMocksAsync(async () => {
			const renderer = new WebGlRenderer();
			setWebGlContextSupported(false);
			await assertRejects(async () => {
				await renderer.init();
			}, WebGlRendererError, "Failed to get WebGL context.");
		});
	},
});

Deno.test({
	name: "render() does nothing when not init or not supported",
	async fn() {
		await runWithWebGlMocksAsync(async () => {
			const renderer = new WebGlRenderer();
			setWebGlContextSupported(false);
			const domTarget = renderer.createDomTarget();
			const { camComponent } = createCam();
			domTarget.render(camComponent);

			await assertRejects(async () => {
				await renderer.init();
			}, WebGlRendererError, "Failed to get WebGL context.");

			domTarget.render(camComponent);
		});
	},
});

Deno.test({
	name: "render() an empty scene",
	async fn() {
		await runWithWebGlMocksAsync(async () => {
			const renderer = new WebGlRenderer();
			await renderer.init();

			const domTarget = renderer.createDomTarget();

			const { camComponent } = createCam();
			domTarget.render(camComponent);

			const { commandLog } = assertHasSingleContext();
			commandLog.assertCount(5);

			commandLog.assertLogEquals([
				{
					name: "viewport",
					args: [0, 0, 300, 150],
				},
				{
					name: "clearColor",
					args: [0, 0, 0, 1],
				},
				{
					name: "clear",
					args: [0],
				},
				{
					name: "enable",
					args: ["GL_DEPTH_TEST"],
				},
				{
					name: "depthFunc",
					args: ["GL_LESS"],
				},
			]);
		});
	},
});

Deno.test({
	name: "Main canvas resizes to that of the largest dom target",
	async fn() {
		await runWithWebGlMocksAsync(async () => {
			const renderer = new WebGlRenderer();
			await renderer.init();

			const { commandLog, canvas } = assertHasSingleContext();

			const domTargetA = renderer.createDomTarget();
			domTargetA.resize(100, 200);
			assertEquals(canvas.width, 100);
			assertEquals(canvas.height, 200);

			const domTargetB = renderer.createDomTarget();
			domTargetB.resize(300, 400);
			assertEquals(canvas.width, 300);
			assertEquals(canvas.height, 400);

			const { camComponent } = createCam();
			domTargetA.render(camComponent);
			domTargetB.render(camComponent);

			const commands1 = commandLog.getFilteredArgs("viewport");
			assertEquals(commands1, [
				[0, 200, 100, 200],
				[0, 0, 300, 400],
			]);
			commandLog.clear();

			domTargetB.resize(1, 1);
			assertEquals(canvas.width, 100);
			assertEquals(canvas.height, 200);

			domTargetA.render(camComponent);
			domTargetB.render(camComponent);

			const commands2 = commandLog.getFilteredArgs("viewport");
			assertEquals(commands2, [
				[0, 0, 100, 200],
				[0, 199, 1, 1],
			]);
		});
	},
});

Deno.test({
	name: "Mesh with single buffer and two attributes",
	async fn() {
		await runWithWebGlMocksAsync(async () => {
			const { scene, domTarget, camComponent, commandLog } = await basicRendererSetup();

			const vertexState = new VertexState({
				buffers: [
					{
						stepMode: "vertex",
						arrayStride: 20,
						attributes: [
							{
								attributeType: Mesh.AttributeType.POSITION,
								componentCount: 3,
								format: Mesh.AttributeFormat.FLOAT32,
								unsigned: false,
							},
							{
								attributeType: Mesh.AttributeType.UV1,
								componentCount: 2,
								format: Mesh.AttributeFormat.FLOAT32,
								unsigned: false,
							},
						],
					},
				],
			});

			const { material } = createMaterial();

			const { mesh } = createCubeEntity(scene, vertexState, material);

			domTarget.render(camComponent);

			const { range: indexBufferRange, index: indexBufferIndex } = commandLog.findRange({
				predicate: (e) => e.name == "createBuffer",
				endOffset: 2,
			});
			assertLogEntryEquals(indexBufferRange[0], { name: "createBuffer" });
			const indexBuffer = indexBufferRange[0].createdObject;

			assertEquals(indexBufferRange[1].name, "bindBuffer");
			assertEquals(indexBufferRange[1].args[0], "GL_ELEMENT_ARRAY_BUFFER");
			assertStrictEquals(indexBufferRange[1].args[1], indexBuffer);

			assertEquals(indexBufferRange[2].name, "bufferData");
			assertEquals(indexBufferRange[2].args[0], "GL_ELEMENT_ARRAY_BUFFER");
			assertStrictEquals(indexBufferRange[2].args[1], mesh.indexBuffer);
			assertEquals(indexBufferRange[2].args[2], "GL_STATIC_DRAW");

			const { range: vertexBufferRange } = commandLog.findRange({
				predicate: (e, i) => e.name == "createBuffer" && i > indexBufferIndex,
				endOffset: 2,
			});

			assertEquals(vertexBufferRange[0].name, "createBuffer");
			const vertexBuffer = vertexBufferRange[0].createdObject;

			assertEquals(vertexBufferRange[1].name, "bindBuffer");
			assertEquals(vertexBufferRange[1].args[0], "GL_ARRAY_BUFFER");
			assertStrictEquals(vertexBufferRange[1].args[1], vertexBuffer);

			assertEquals(vertexBufferRange[2].name, "bufferData");
			assertEquals(vertexBufferRange[2].args[0], "GL_ARRAY_BUFFER");
			assertStrictEquals(vertexBufferRange[2].args[1], Array.from(mesh.getAttributeBuffers())[0].buffer);
			assertEquals(vertexBufferRange[2].args[2], "GL_STATIC_DRAW");

			const { index: drawIndex, range: drawRange } = commandLog.findRange({
				predicate: (e) => e.name == "drawElements",
				startOffset: -4,
			});

			commandLog.assertLastBoundBuffer("GL_ELEMENT_ARRAY_BUFFER", indexBuffer, drawIndex);
			commandLog.assertLastBoundBuffer("GL_ARRAY_BUFFER", vertexBuffer, drawIndex);

			// TODO: I'm pretty sure the offset parameter of vertexAttribPointer is wrong here.
			assertLogEquals(drawRange, [
				{
					name: "vertexAttribPointer",
					args: [0, 3, "GL_FLOAT", false, 20, 0],
				},
				{
					name: "enableVertexAttribArray",
					args: [0],
				},
				{
					name: "vertexAttribPointer",
					args: [1, 2, "GL_FLOAT", false, 20, 0],
				},
				{
					name: "enableVertexAttribArray",
					args: [1],
				},
				{
					name: "drawElements",
					args: ["GL_TRIANGLES", 36, "GL_UNSIGNED_SHORT", 0],
				},
			]);
		});
	},
});

testTypes({
	name: "CustomMaterialData callback arguments have the correct types",
	fn() {
		const renderer = new WebGlRenderer();
		const customData = new CustomMaterialData();
		customData.registerCallback(renderer, (gl, location) => {
			// Verify that the type is a WebGLRenderingContext and nothing else
			assertIsType(new WebGLRenderingContext(), gl);

			// @ts-expect-error Verify that the type isn't 'any'
			assertIsType(true, gl);

			// Verify that the type is a WebGLUniformLocation and nothing else
			assertIsType(new WebGLUniformLocation(), location);

			// @ts-expect-error Verify that the type isn't 'any'
			assertIsType(true, location);
		});
	},
});
