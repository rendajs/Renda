import { assertEquals, assertRejects } from "std/testing/asserts.ts";
import { CustomMaterialData, WebGlRenderer, WebGlRendererError } from "../../../../../../src/mod.js";
import { assertHasSingleContext, runWithWebGlMocksAsync, setWebGlContextSupported } from "./shared/webGlMocks.js";
import { assertIsType, testTypes } from "../../../../shared/typeAssertions.js";
import { createCam } from "../shared/sceneUtil.js";

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
	name: "render() an empty scene",
	async fn() {
		await runWithWebGlMocksAsync(async () => {
			const renderer = new WebGlRenderer();
			await renderer.init();

			const domTarget = renderer.createDomTarget();

			const { camComponent } = createCam();
			renderer.render(domTarget, camComponent);

			const commandLog = assertHasSingleContext();
			commandLog.assertCount(5);

			assertEquals(commandLog.log, [
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
					args: ["WEBGL_CONSTANT_DEPTH_TEST"],
				},
				{
					name: "depthFunc",
					args: ["WEBGL_CONSTANT_LESS"],
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
