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

		await manager.watchAsset("uuid", callbackSpy);

		assertSpyCall(getAssetSpy, 0, {
			args: ["uuid"],
		});
		assertSpyCall(callbackSpy, 0, {
			args: ["result"],
		});

		await manager.notifyAssetChanged("uuid");

		assertSpyCalls(getAssetSpy, 2);
		assertSpyCalls(callbackSpy, 2);
	},
});
