import {assertSpyCall, assertSpyCalls, stub} from "std/testing/mock.ts";
import {InspectorAssetBundle} from "../../../../../src/mod.js";
import {assertEquals, assertExists} from "std/testing/asserts.ts";

function getMockInspectorManager() {
	return /** @type {import("../../../../../src/mod.js").InspectorManager} */ (/** @type {unknown} */ ({}));
}

Deno.test({
	name: "hasAsset() asks the inspector manager",
	async fn() {
		const mockManager = getMockInspectorManager();
		const hasAssetSpy = stub(mockManager, "requestHasAsset", () => Promise.resolve(true));
		const bundle = new InspectorAssetBundle(mockManager);
		const result = await bundle.hasAsset("uuid");
		assertEquals(result, true);

		assertSpyCalls(hasAssetSpy, 1);
		assertSpyCall(hasAssetSpy, 0, {
			args: ["uuid"],
		});
	},
});

Deno.test({
	name: "waitForAssetAvailable() asks the inspector manager",
	async fn() {
		const mockManager = getMockInspectorManager();
		const hasAssetSpy = stub(mockManager, "requestHasAsset", () => Promise.resolve(false));
		const bundle = new InspectorAssetBundle(mockManager);
		const result = await bundle.waitForAssetAvailable("uuid");
		assertEquals(result, false);

		assertSpyCalls(hasAssetSpy, 1);
		assertSpyCall(hasAssetSpy, 0, {
			args: ["uuid"],
		});
	},
});

Deno.test({
	name: "getAsset() asks the inspector manager",
	async fn() {
		const mockManager = getMockInspectorManager();
		const bundledAssetDataSpy = stub(mockManager, "requestBundledAssetData", () => Promise.resolve({
			type: "typeid",
			buffer: new ArrayBuffer(0),
		}));
		const bundle = new InspectorAssetBundle(mockManager);
		const result = await bundle.getAsset("uuid");
		assertExists(result);
		assertEquals(result.type, "typeid");

		assertSpyCalls(bundledAssetDataSpy, 1);
		assertSpyCall(bundledAssetDataSpy, 0, {
			args: ["uuid"],
		});
	},
});
