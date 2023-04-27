import {assertSpyCall, assertSpyCalls, spy, stub} from "std/testing/mock.ts";
import {assertEquals} from "std/testing/asserts.ts";
import {EngineAssetsManager} from "../../../../../src/mod.js";
import {createMockAssetLoader} from "./shared.js";

Deno.test({
	name: "getAsset directly maps to the asset loader when no handler returns a result",
	async fn() {
		const assetLoader = createMockAssetLoader();
		const getAssetSpy = stub(assetLoader, "getAsset", async () => "result");
		const manager = new EngineAssetsManager(assetLoader);

		manager.addGetAssetHandler(uuid => {
			return null;
		});

		const result = await manager.getAsset("uuid", {
			createNewInstance: true,
			assetOpts: {
				foo: "bar",
			},
		});

		assertEquals(result, "result");
		assertSpyCalls(getAssetSpy, 1);
		assertSpyCall(getAssetSpy, 0, {
			args: [
				"uuid",
				{
					createNewInstance: true,
					assetOpts:
					{
						foo: "bar",
					},
				},
			],
		});
	},
});
Deno.test({
	name: "getAsset uses the result from handlers",
	async fn() {
		const assetLoader = createMockAssetLoader();
		const getAssetSpy = stub(assetLoader, "getAsset", async () => "wrong result");
		const manager = new EngineAssetsManager(assetLoader);

		manager.addGetAssetHandler(uuid => {
			return "result";
		});

		const result = await manager.getAsset("uuid", {
			createNewInstance: true,
			assetOpts: {
				foo: "bar",
			},
		});

		assertEquals(result, "result");
		assertSpyCalls(getAssetSpy, 0);
	},
});

Deno.test({
	name: "watchAsset fires when registering, and again when an asset changes",
	async fn() {
		const assetLoader = createMockAssetLoader();
		const getAssetSpy = stub(assetLoader, "getAsset", async () => "result");
		const manager = new EngineAssetsManager(assetLoader);

		/** @param {unknown} asset */
		function spyFn(asset) {}
		const callbackSpy = spy(spyFn);

		await manager.watchAsset("uuid", {
			assetOpts: {foo: "bar"},
		}, callbackSpy);

		assertSpyCall(getAssetSpy, 0, {
			args: ["uuid", {assetOpts: {foo: "bar"}}],
		});
		assertSpyCall(callbackSpy, 0, {
			args: ["result"],
		});

		await manager.notifyAssetChanged("uuid");

		assertSpyCalls(getAssetSpy, 2);
		assertSpyCalls(callbackSpy, 2);
	},
});

Deno.test({
	name: "watchAsset options are passed when an asset changes",
	async fn() {
		const assetLoader = createMockAssetLoader();
		const getAssetSpy = stub(assetLoader, "getAsset", async (uuid, options) => {
			return options?.assetOpts;
		});
		const manager = new EngineAssetsManager(assetLoader);

		/** @param {unknown} asset */
		function spyFn(asset) {}
		const callbackSpy1 = spy(spyFn);
		const callbackSpy2 = spy(spyFn);

		await manager.watchAsset("uuid", {
			assetOpts: "watch1",
		}, callbackSpy1);
		await manager.watchAsset("uuid", {
			assetOpts: "watch2",
		}, callbackSpy2);

		assertSpyCall(getAssetSpy, 0, {
			args: ["uuid", {assetOpts: "watch1"}],
		});
		assertSpyCall(getAssetSpy, 1, {
			args: ["uuid", {assetOpts: "watch2"}],
		});
		assertSpyCall(callbackSpy1, 0, {
			args: ["watch1"],
		});
		assertSpyCall(callbackSpy2, 0, {
			args: ["watch2"],
		});

		await manager.notifyAssetChanged("uuid");

		assertSpyCall(getAssetSpy, 2, {
			args: ["uuid", {assetOpts: "watch1"}],
		});
		assertSpyCall(getAssetSpy, 3, {
			args: ["uuid", {assetOpts: "watch2"}],
		});
		assertSpyCall(callbackSpy1, 1, {
			args: ["watch1"],
		});
		assertSpyCall(callbackSpy2, 1, {
			args: ["watch2"],
		});

		assertSpyCalls(getAssetSpy, 4);
		assertSpyCalls(callbackSpy1, 2);
		assertSpyCalls(callbackSpy2, 2);
	},
});
