import { stub } from "std/testing/mock.ts";
import { InspectorAssetBundle } from "../../../../../src/mod.js";
import { assertEquals, assertExists, assertRejects } from "std/testing/asserts.ts";
import { createMockInspectorManager } from "../../inspector/InspectorManager/shared.js";
import { createMockProjectAsset } from "../../../studio/shared/createMockProjectAsset.js";

Deno.test({
	name: "hasAsset() asks the inspector manager",
	async fn() {
		const { mockInspectorManager, mockAssetManager } = createMockInspectorManager();
		stub(mockAssetManager, "getProjectAssetFromUuid", async uuid => {
			if (uuid == "existingUuid") {
				return /** @type {import("../../../../../studio/src/assets/ProjectAsset.js").ProjectAssetAny} */ ({});
			} else {
				return null;
			}
		});
		const bundle = new InspectorAssetBundle(mockInspectorManager);
		assertEquals(await bundle.hasAsset("existingUuid"), true);
		assertEquals(await bundle.hasAsset("nonExistentUuid"), false);
	},
});

Deno.test({
	name: "waitForAssetAvailable() asks the inspector manager",
	async fn() {
		const { mockInspectorManager, mockAssetManager } = createMockInspectorManager();
		stub(mockAssetManager, "getProjectAssetFromUuid", async uuid => {
			if (uuid == "existingUuid") {
				return /** @type {import("../../../../../studio/src/assets/ProjectAsset.js").ProjectAssetAny} */ ({});
			} else {
				return null;
			}
		});
		const bundle = new InspectorAssetBundle(mockInspectorManager);
		assertEquals(await bundle.waitForAssetAvailable("existingUuid"), true);
		assertEquals(await bundle.waitForAssetAvailable("nonExistentUuid"), false);
	},
});

Deno.test({
	name: "getAsset() returns asset data if it exists",
	async fn() {
		const { mockInspectorManager, mockAssetManager } = createMockInspectorManager();
		stub(mockAssetManager, "getProjectAssetFromUuid", async uuid => {
			if (uuid == "the uuid") {
				const { projectAsset } = createMockProjectAsset();
				stub(projectAsset, "getAssetTypeUuid", async () => "asset type uuid");
				stub(projectAsset, "getBundledAssetData", async () => new Uint8Array([1, 2, 3]).buffer);
				return projectAsset;
			}
			return null;
		});
		const bundle = new InspectorAssetBundle(mockInspectorManager);
		assertEquals(await bundle.getAsset("nonexistent"), null);
		const result = await bundle.getAsset("the uuid");
		assertExists(result);
		assertEquals(result.type, "asset type uuid");
		assertEquals(Array.from(new Uint8Array(result.buffer)), [1, 2, 3]);
	},
});

Deno.test({
	name: "getAsset() throws when asset type is unknown",
	async fn() {
		const { mockInspectorManager, mockAssetManager } = createMockInspectorManager();
		stub(mockAssetManager, "getProjectAssetFromUuid", async uuid => {
			const { projectAsset } = createMockProjectAsset();
			stub(projectAsset, "getAssetTypeUuid", async () => null);
			return projectAsset;
		});
		const bundle = new InspectorAssetBundle(mockInspectorManager);
		await assertRejects(async () => {
			await bundle.getAsset("uuid");
		}, Error, 'Failed to get bundled asset data for asset with uuid "uuid" and path "path/to/asset". Asset does not have a known asset type.');
	},
});

Deno.test({
	name: "getAsset() transfers assets with text data as buffer",
	async fn() {
		const { mockInspectorManager, mockAssetManager } = createMockInspectorManager();
		stub(mockAssetManager, "getProjectAssetFromUuid", async uuid => {
			const { projectAsset } = createMockProjectAsset();
			stub(projectAsset, "getAssetTypeUuid", async () => "asset type uuid");
			stub(projectAsset, "getBundledAssetData", async () => "abcd");
			return projectAsset;
		});
		const bundle = new InspectorAssetBundle(mockInspectorManager);
		const result = await bundle.getAsset("uuid");
		assertExists(result);
		assertEquals(Array.from(new Uint8Array(result.buffer)), [97, 98, 99, 100]);
	},
});
