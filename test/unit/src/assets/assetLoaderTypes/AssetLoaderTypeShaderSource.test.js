import {assertEquals, assertRejects} from "std/testing/asserts.ts";
import {AssetLoaderTypeShaderSource} from "../../../../../src/mod.js";

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
	});
	return {
		mockShaderBuilder,
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
		const {mockAssetLoader, getAssetReturnValues} = getMockAssetLoader();
		const {mockShaderBuilder, requestShaderUuid} = getMockShaderBuilder();
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
		const {mockAssetLoader, getAssetReturnValues} = getMockAssetLoader();
		const {mockShaderBuilder, requestShaderUuid} = getMockShaderBuilder();
		const SHADER_UUID = "SHADER_UUID";
		getAssetReturnValues.set(SHADER_UUID, {label: "not a string"});

		const loaderType = new AssetLoaderTypeShaderSource(mockAssetLoader);
		loaderType.setBuilder(mockShaderBuilder);

		await assertRejects(async () => {
			await requestShaderUuid(SHADER_UUID);
		}, Error, "Tried to load a shader but the resolved asset is not a string. Did you @import the wrong uuid?");
	},
});
