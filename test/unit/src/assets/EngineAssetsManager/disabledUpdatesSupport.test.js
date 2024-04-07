import { Importer } from "fake-imports";
import { assertSpyCall, assertSpyCalls, spy, stub } from "std/testing/mock.ts";
import { assertEquals } from "std/testing/asserts.ts";
import { createMockAssetLoader } from "./shared.js";

const importer = new Importer(import.meta.url);
importer.fakeModule("../../../../../src/engineDefines.js", `
	export const ENGINE_ASSETS_LIVE_UPDATES_SUPPORT = false;
`);

/** @type {import("../../../../../src/assets/EngineAssetsManager.js")} */
const EngineAssetsManagerMod = await importer.import("../../../../../src/assets/EngineAssetsManager.js");
const { EngineAssetsManager } = EngineAssetsManagerMod;

Deno.test({
	name: "getAsset directly maps to the asset loader",
	async fn() {
		const assetLoader = createMockAssetLoader();
		const getAssetSpy = stub(assetLoader, "getAsset", async () => "result");
		const manager = new EngineAssetsManager(assetLoader);

		manager.addGetAssetHandler((uuid) => {
			return "incorrect result";
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
	name: "watchAsset fires exactly once",
	async fn() {
		const assetLoader = createMockAssetLoader();
		const getAssetSpy = stub(assetLoader, "getAsset", async () => "result");
		const manager = new EngineAssetsManager(assetLoader);

		/** @param {unknown} asset */
		function spyFn(asset) {}
		const callbackSpy = spy(spyFn);

		await manager.watchAsset("uuid", {
			assetOpts: { foo: "bar" },
		}, callbackSpy);

		assertSpyCall(getAssetSpy, 0, {
			args: ["uuid", { assetOpts: { foo: "bar" } }],
		});
		assertSpyCall(callbackSpy, 0, {
			args: ["result"],
		});

		await manager.notifyAssetChanged("uuid");

		assertSpyCalls(getAssetSpy, 1);
		assertSpyCalls(callbackSpy, 1);
	},
});
