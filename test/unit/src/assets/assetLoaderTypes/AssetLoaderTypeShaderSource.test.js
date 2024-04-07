import { assertEquals, assertInstanceOf, assertRejects } from "std/testing/asserts.ts";
import { AssetLoaderTypeShaderSource, ShaderSource } from "../../../../../src/mod.js";
import { getMockRecursionTracker } from "../shared.js";
import { assertSpyCalls, spy } from "std/testing/mock.ts";

function getMockAssetLoader() {
	/** @type {Map<import("../../../../../src/mod.js").UuidString, unknown>} */
	const getAssetReturnValues = new Map();
	const mockAssetLoader = /** @type {import("../../../../../src/assets/AssetLoader.js").AssetLoader} */ ({
		getAsset(uuid, opts) {
			return getAssetReturnValues.get(uuid);
		},
	});
	return {
		mockAssetLoader,
		getAssetReturnValues,
	};
}

function getMockShaderBuilder() {
	/** @type {import("../../../../../src/rendering/ShaderBuilder.js").ShaderUuidRequestedHook?} */
	let currentHook = null;
	const mockShaderBuilder = /** @type {import("../../../../../src/mod.js").ShaderBuilder} */ ({
		onShaderUuidRequested(hook) {
			currentHook = hook;
		},
		async buildShader(shaderCode) {
			/** @type {import("../../../../../src/mod.js").UuidString[]} */
			const includedUuids = [];
			return {
				shaderCode,
				includedUuids,
			};
		},
	});

	const buildShaderSpy = spy(mockShaderBuilder, "buildShader");

	return {
		mockShaderBuilder,
		buildShaderSpy,
		/**
		 * @param {import("../../../../../src/mod.js").UuidString} uuid
		 */
		requestShaderUuid(uuid) {
			if (!currentHook) {
				throw new Error("No hook has been set");
			}
			return currentHook(uuid);
		},
	};
}

Deno.test({
	name: "Provides shadercode when the shader builder requests one",
	async fn() {
		const { mockAssetLoader, getAssetReturnValues } = getMockAssetLoader();
		const { mockShaderBuilder, requestShaderUuid } = getMockShaderBuilder();
		const SHADER_UUID = "SHADER_UUID";
		getAssetReturnValues.set(SHADER_UUID, "shadercode");

		const loaderType = new AssetLoaderTypeShaderSource(mockAssetLoader);
		loaderType.setBuilder(mockShaderBuilder);

		const result = await requestShaderUuid(SHADER_UUID);
		assertEquals(result, "shadercode");
	},
});

Deno.test({
	name: "Throws when a requested shader uuid is not a shader asset",
	async fn() {
		const { mockAssetLoader, getAssetReturnValues } = getMockAssetLoader();
		const { mockShaderBuilder, requestShaderUuid } = getMockShaderBuilder();
		const SHADER_UUID = "SHADER_UUID";
		getAssetReturnValues.set(SHADER_UUID, { label: "not a string" });

		const loaderType = new AssetLoaderTypeShaderSource(mockAssetLoader);
		loaderType.setBuilder(mockShaderBuilder);

		await assertRejects(async () => {
			await requestShaderUuid(SHADER_UUID);
		}, Error, "Tried to load a shader but the resolved asset is not a string. Did you @import the wrong uuid?");
	},
});

Deno.test({
	name: "parseBuffer() uses the builder by default",
	async fn() {
		const { mockAssetLoader } = getMockAssetLoader();
		const { mockShaderBuilder, buildShaderSpy } = getMockShaderBuilder();
		const mockRecursionTracker = getMockRecursionTracker();

		const loaderType = new AssetLoaderTypeShaderSource(mockAssetLoader);
		loaderType.setBuilder(mockShaderBuilder);

		const buffer = new TextEncoder().encode("this is a string of shader code");
		const result = await loaderType.parseBuffer(buffer, mockRecursionTracker);
		assertInstanceOf(result, ShaderSource);
		assertEquals(result.source, "this is a string of shader code");
		assertSpyCalls(buildShaderSpy, 1);
	},
});

Deno.test({
	name: "parseBuffer() throws when no builder has been set",
	async fn() {
		const { mockAssetLoader } = getMockAssetLoader();
		const mockRecursionTracker = getMockRecursionTracker();

		const loaderType = new AssetLoaderTypeShaderSource(mockAssetLoader);

		const buffer = new TextEncoder().encode("this is a string of shader code");
		await assertRejects(async () => {
			await loaderType.parseBuffer(buffer, mockRecursionTracker);
		}, Error, `Failed to load shader because no shader builder was provided.`);
	},
});

Deno.test({
	name: "parseBuffer() doesn't use shaderbuilder when raw = true",
	async fn() {
		const { mockAssetLoader } = getMockAssetLoader();
		const { mockShaderBuilder, buildShaderSpy } = getMockShaderBuilder();
		const mockRecursionTracker = getMockRecursionTracker();

		const loaderType = new AssetLoaderTypeShaderSource(mockAssetLoader);
		loaderType.setBuilder(mockShaderBuilder);

		const buffer = new TextEncoder().encode("this is a string of shader code");
		const result = await loaderType.parseBuffer(buffer, mockRecursionTracker, { raw: true });
		assertEquals(result, "this is a string of shader code");
		assertSpyCalls(buildShaderSpy, 0);
	},
});
