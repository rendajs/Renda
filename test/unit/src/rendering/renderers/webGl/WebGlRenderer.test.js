import { assertEquals, assertRejects, assertStrictEquals } from "std/testing/asserts.ts";
import { CustomMaterialData, Entity, Material, MaterialMap, Mesh, ShaderSource, VertexState, WebGlMaterialConfig, WebGlMaterialMapType, WebGlRenderer, WebGlRendererError } from "../../../../../../src/mod.js";
import { assertHasSingleWebGlContext, runWithWebGlMocksAsync, setWebGlContextSupported } from "./shared/webGlMocks.js";
import { assertIsType, testTypes } from "../../../../shared/typeAssertions.js";
import { createCam, createCubeEntity, createVertexState } from "../shared/sceneUtil.js";
import { assertLogEntryEquals, assertLogEquals } from "./shared/WebGlCommandLog.js";
import { assertHasSingle2dRenderingContext } from "./shared/RenderingContext2d.js";
import { assertSpyCall, assertSpyCalls, spy } from "std/testing/mock.ts";

async function basicRendererSetup() {
	const renderer = new WebGlRenderer();
	await renderer.init();

	const domTarget = renderer.createDomTarget();
	const { cam, camComponent } = createCam();

	const scene = new Entity();
	scene.add(cam);

	const context = assertHasSingleWebGlContext();

	return { renderer, domTarget, camComponent, scene, ...context };
}

/**
 * @param {object} options
 * @param {import("../../../../../../src/mod.js").MaterialMapMappedValues} [options.mappedValues]
 * @param {string} [options.vertexShader]
 */
function createMaterial({
	mappedValues = {},
	vertexShader = "",
} = {}) {
	const material = new Material();
	const materialMapType = new WebGlMaterialMapType();
	const materialConfig = new WebGlMaterialConfig();
	materialConfig.vertexShader = new ShaderSource(vertexShader);
	materialConfig.fragmentShader = new ShaderSource("");
	materialMapType.materialConfig = materialConfig;
	const materialMap = new MaterialMap({
		materialMapTypes: [
			{
				mapType: materialMapType,
				mappedValues,
			},
		],
	});
	material.setMaterialMap(materialMap);
	return { material, materialConfig };
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

			const context2d = assertHasSingle2dRenderingContext();
			const { commandLog, canvas: webGlCanvas } = assertHasSingleWebGlContext();

			const clearRectSpy = spy(context2d, "clearRect");
			const drawImageSpy = spy(context2d, "drawImage");

			const { camComponent } = createCam();
			domTarget.render(camComponent);

			assertSpyCalls(clearRectSpy, 1);
			assertSpyCall(clearRectSpy, 0, {
				args: [0, 0, 300, 150],
			});
			assertSpyCalls(drawImageSpy, 1);
			assertEquals(drawImageSpy.calls[0].args.length, 3);
			assertStrictEquals(drawImageSpy.calls[0].args[0], webGlCanvas);
			assertEquals(drawImageSpy.calls[0].args[1], 0);
			assertEquals(drawImageSpy.calls[0].args[2], 0);

			commandLog.assertCount(5);

			commandLog.assertLogEquals([
				{
					name: "viewport",
					args: [0, 0, 300, 150],
				},
				{
					name: "clearColor",
					args: [0, 0, 0, 0],
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

			const { commandLog, canvas } = assertHasSingleWebGlContext();

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
			const { scene, domTarget, camComponent, commandLog, setAttributeLocations } = await basicRendererSetup();

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
								shaderLocation: 0,
							},
							{
								attributeType: Mesh.AttributeType.UV1,
								componentCount: 2,
								format: Mesh.AttributeFormat.FLOAT32,
								unsigned: false,
								shaderLocation: 1,
							},
						],
					},
				],
			});

			const { material } = createMaterial({
				vertexShader: `
					// @location(0)
					attribute vec3 pos;
					// @location(1)
					attribute vec2 uv;
				`,
			});

			setAttributeLocations({
				pos: 0,
				uv: 1,
			});

			const { mesh } = createCubeEntity({ scene, vertexState, material });

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

Deno.test({
	name: "Material cull mode",
	async fn() {
		await runWithWebGlMocksAsync(async () => {
			const { scene, domTarget, camComponent, commandLog } = await basicRendererSetup();
			const vertexState = createVertexState();

			/** @type {import("../../../../../../src/mod.js").MaterialMapMappedValues} */
			const mappedValues = {
				cullMode: {
					mappedType: "enum",
					defaultValue: "back",
					mappedName: "cullMode",
				},
			};
			const { material: materialA } = createMaterial({ mappedValues });
			createCubeEntity({ scene, material: materialA, vertexState });

			const { material: materialB } = createMaterial({ mappedValues });
			materialB.setProperty("cullMode", "front");
			createCubeEntity({ scene, material: materialB, vertexState });

			const { material: materialC } = createMaterial({ mappedValues });
			materialC.setProperty("cullMode", "front");
			createCubeEntity({ scene, material: materialC, vertexState });

			const { material: materialD } = createMaterial({ mappedValues });
			materialD.setProperty("cullMode", "none");
			createCubeEntity({ scene, material: materialD, vertexState });

			const { material: materialE } = createMaterial({ mappedValues });
			materialE.setProperty("cullMode", "back");
			createCubeEntity({ scene, material: materialE, vertexState });

			domTarget.render(camComponent);

			const cullCommands = commandLog.getFilteredCommands("cullFace", "enable", "disable")
				.filter((e) => {
					if (e.name == "enable" || e.name == "disable") {
						if (e.args[0] != "GL_CULL_FACE") return false;
					}
					return true;
				});

			assertLogEquals(cullCommands, [
				{ name: "enable", args: ["GL_CULL_FACE"] },
				{ name: "cullFace", args: ["GL_BACK"] },
				{ name: "cullFace", args: ["GL_FRONT"] },
				{ name: "disable", args: ["GL_CULL_FACE"] },
				{ name: "enable", args: ["GL_CULL_FACE"] },
				{ name: "cullFace", args: ["GL_BACK"] },
			]);
		});
	},
});

Deno.test({
	name: "Material blend mode",
	async fn() {
		await runWithWebGlMocksAsync(async () => {
			const { scene, domTarget, camComponent, commandLog } = await basicRendererSetup();
			const vertexState = createVertexState();

			const { material: materialA, materialConfig: configA } = createMaterial();
			configA.blend = {
				srcFactor: 1, // GL_ONE
				dstFactor: 1, // GL_ONE
			};
			createCubeEntity({ scene, material: materialA, vertexState });

			const { material: materialB } = createMaterial();
			createCubeEntity({ scene, material: materialB, vertexState });

			const { material: materialC, materialConfig: configC } = createMaterial();
			configC.blend = {
				srcFactor: 0, // GL_ZERO
				dstFactor: 1, // GL_ONE
			};
			createCubeEntity({ scene, material: materialC, vertexState });

			const { material: materialD, materialConfig: configD } = createMaterial();
			configD.blend = {
				srcFactor: 0, // GL_ZERO
				dstFactor: 1, // GL_ONE
				srcFactorAlpha: 1, // GL_ONE
			};
			createCubeEntity({ scene, material: materialD, vertexState });

			const { material: materialE, materialConfig: configE } = createMaterial();
			configE.blend = {
				srcFactor: 0, // GL_ZERO
				dstFactor: 1, // GL_ONE
				srcFactorAlpha: 1, // GL_ONE
			};
			createCubeEntity({ scene, material: materialE, vertexState });

			const { material: materialF, materialConfig: configF } = createMaterial();
			configF.blend = {
				srcFactor: 0, // GL_ZERO
				dstFactor: 1, // GL_ONE
				srcFactorAlpha: 1, // GL_ONE
				dstFactorAlpha: 0, // GL_ZERO
			};
			createCubeEntity({ scene, material: materialF, vertexState });

			domTarget.render(camComponent);

			const blendCommands = commandLog.getFilteredCommands("blendFuncSeparate", "enable", "disable")
				.filter((e) => {
					if (e.name == "enable" || e.name == "disable") {
						if (e.args[0] != "GL_BLEND") return false;
					}
					return true;
				});

			assertLogEquals(blendCommands, [
				{ name: "enable", args: ["GL_BLEND"] },
				{ name: "blendFuncSeparate", args: [1, 1, 1, 1] },
				{ name: "disable", args: ["GL_BLEND"] },
				{ name: "enable", args: ["GL_BLEND"] },
				{ name: "blendFuncSeparate", args: [0, 1, 0, 1] },
				{ name: "blendFuncSeparate", args: [0, 1, 1, 1] },
				{ name: "blendFuncSeparate", args: [0, 1, 1, 0] },
			]);
		});
	},
});

Deno.test({
	name: "CustomMaterialData",
	async fn() {
		await runWithWebGlMocksAsync(async () => {
			const { renderer, scene, domTarget, camComponent, commandLog } = await basicRendererSetup();

			const vertexState = createVertexState();
			const { material } = createMaterial({
				mappedValues: {
					custom: {
						mappedName: "custom",
						mappedType: "custom",
						defaultValue: null,
					},
				},
			});
			const customData = new CustomMaterialData();
			/** @type {{gl: WebGLRenderingContext, location: WebGLUniformLocation}[]} */
			const calls = [];
			customData.registerCallback(renderer, (gl, location) => {
				calls.push({ gl, location });
				gl.uniform1f(location, 42);
			});
			material.setProperty("custom", customData);
			createCubeEntity({ scene, material, vertexState });

			domTarget.render(camComponent);

			assertEquals(calls.length, 1);
			assertStrictEquals(calls[0].gl, renderer.getWebGlContext());
			const { range: uniformRange } = commandLog.findRange({
				predicate: (e) => {
					return e.name == "getUniformLocation" && e.args[1] == "materialUniforms_custom";
				},
				endOffset: 1,
			});
			assertStrictEquals(calls[0].location, uniformRange[0].createdObject);
			assertStrictEquals(uniformRange[1].args[0], uniformRange[0].createdObject);

			assertEquals(uniformRange[1].name, "uniform1f");
			assertEquals(uniformRange[1].args[1], 42);
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

Deno.test({
	name: "Mesh with uint32 index format",
	async fn() {
		await runWithWebGlMocksAsync(async () => {
			const { scene, domTarget, camComponent, commandLog } = await basicRendererSetup();

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
								shaderLocation: 0,
							},
						],
					},
				],
			});

			const { material } = createMaterial();

			const { mesh } = createCubeEntity({ scene, vertexState, material });
			mesh.setIndexFormat(Mesh.IndexFormat.UINT_32);

			domTarget.render(camComponent);

			const { range: indexBufferRange } = commandLog.findRange({
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

			const { range: drawRange, index: drawIndex } = commandLog.findRange({
				predicate: (e) => e.name == "drawElements",
			});

			assertLogEquals(drawRange, [
				{
					name: "drawElements",
					args: ["GL_TRIANGLES", 36, "GL_UNSIGNED_INT", 0],
				},
			]);

			// Check if OES_element_index_uint was enabled before the draw call
			commandLog.assertExists({
				predicate: (e, i) => e.name == "getExtension" && e.args[0] == "OES_element_index_uint" && i < drawIndex,
			});

			// Make sure the extension is enabled only once.
			domTarget.render(camComponent);
			const extensionEntries = commandLog.log.filter((e) => {
				return e.name == "getExtension" && e.args[0] == "OES_element_index_uint";
			});
			assertEquals(extensionEntries.length, 1);
		});
	},
});

Deno.test({
	name: "Materials are rendered by render order",
	async fn() {
		await runWithWebGlMocksAsync(async () => {
			const { scene, domTarget, camComponent, commandLog } = await basicRendererSetup();

			const vertexState = createVertexState();

			const { material: materialA, materialConfig: configA } = createMaterial();
			configA.renderOrder = 0;
			configA.blend = {
				srcFactor: 0,
				dstFactor: 0,
			};
			createCubeEntity({ scene, material: materialA, vertexState });

			const { material: materialB, materialConfig: configB } = createMaterial();
			configB.renderOrder = 1;
			configB.blend = {
				srcFactor: 1,
				dstFactor: 1,
			};
			createCubeEntity({ scene, material: materialB, vertexState });

			domTarget.render(camComponent);
			assertLogEquals(commandLog.getFilteredCommands("blendFuncSeparate"), [
				{ name: "blendFuncSeparate", args: [0, 0, 0, 0] },
				{ name: "blendFuncSeparate", args: [1, 1, 1, 1] },
			]);

			commandLog.clear();
			// We flip the render order of the two materials to check if the two blend states get flipped.
			configA.renderOrder = 1;
			configB.renderOrder = 0;

			domTarget.render(camComponent);
			assertLogEquals(commandLog.getFilteredCommands("blendFuncSeparate"), [
				// We don't expect a 1,1,1,1 command because that's already the current blend state
				{ name: "blendFuncSeparate", args: [0, 0, 0, 0] },
			]);
		});
	},
});

Deno.test({
	name: "Materials with depthWriteEnabled false disable the depth mask",
	async fn() {
		await runWithWebGlMocksAsync(async () => {
			const { scene, domTarget, camComponent, commandLog } = await basicRendererSetup();

			const vertexState = createVertexState();

			const { material, materialConfig } = createMaterial();
			materialConfig.depthWriteEnabled = false;
			createCubeEntity({ scene, material, vertexState });

			domTarget.render(camComponent);
			assertLogEquals(commandLog.getFilteredCommands("depthMask"), [{ name: "depthMask", args: [false] }]);

			commandLog.clear();

			domTarget.render(camComponent);
			assertLogEquals(commandLog.getFilteredCommands("depthMask", "viewport", "clear"), [
				{ name: "viewport" },
				// The depthMask needs to be enabled otherwise the gl.clear(gl.DEPTH_BUFFER_BIT)
				// command won't have any effect
				{ name: "depthMask", args: [true] },
				{ name: "clear" },
				{ name: "depthMask", args: [false] },
			]);
		});
	},
});

Deno.test({
	name: "Meshes without vertex state are not rendered",
	async fn() {
		await runWithWebGlMocksAsync(async () => {
			const { scene, domTarget, camComponent, commandLog } = await basicRendererSetup();

			const { material } = createMaterial();
			createCubeEntity({ scene, material, vertexState: null });

			domTarget.render(camComponent);

			commandLog.assertLogEquals([
				{
					name: "viewport",
					args: [0, 0, 300, 150],
				},
				{
					name: "clearColor",
					args: [0, 0, 0, 0],
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
	name: "An error is thrown when a shader contains duplicate location tags",
	async fn() {
		await runWithWebGlMocksAsync(async () => {
			const { scene, domTarget, camComponent } = await basicRendererSetup();

			const { material } = createMaterial({
				vertexShader: `
// @location(0)
attribute vec3 pos;
// @location(0)
attribute vec3 color;
				`,
			});
			createCubeEntity({ scene, material, vertexState: createVertexState() });

			await assertRejects(async () => {
				domTarget.render(camComponent);
			}, Error, "Shader contains multiple attributes tagged with @location(0).");
		});
	},
});
