import { assertEquals } from "std/testing/asserts.ts";
import { ProjectAsset } from "../../../../../../studio/src/assets/ProjectAsset.js";
import { BASIC_ASSET_EXTENSION, BASIC_PROJECTASSETTYPE, UNKNOWN_ASSET_EXTENSION, getMocks } from "./shared.js";

Deno.test({
	name: "guessAssetTypeFromPath(), empty path array",
	fn() {
		const { mockProjectAssetTypeManager } = getMocks();

		const result = ProjectAsset.guessAssetTypeFromPath(mockProjectAssetTypeManager, []);
		assertEquals(result, null);
	},
});

Deno.test({
	name: "guessAssetTypeFromPath(), json file",
	fn() {
		const { mockProjectAssetTypeManager } = getMocks();

		const result = ProjectAsset.guessAssetTypeFromPath(mockProjectAssetTypeManager, ["path", "to", "asset.json"]);
		assertEquals(result, null);
	},
});

Deno.test({
	name: "guessAssetTypeFromPath(), no extension",
	fn() {
		const { mockProjectAssetTypeManager } = getMocks();

		const result = ProjectAsset.guessAssetTypeFromPath(mockProjectAssetTypeManager, ["path", "to", "asset"]);
		assertEquals(result, null);
	},
});

Deno.test({
	name: "guessAssetTypeFromPath(), basic extension",
	fn() {
		const { mockProjectAssetTypeManager } = getMocks();

		const result = ProjectAsset.guessAssetTypeFromPath(mockProjectAssetTypeManager, ["path", "to", `asset.${BASIC_ASSET_EXTENSION}`]);
		assertEquals(result, BASIC_PROJECTASSETTYPE);
	},
});

Deno.test({
	name: "guessAssetTypeFromPath(), unknown extension",
	fn() {
		const { mockProjectAssetTypeManager } = getMocks();

		const result = ProjectAsset.guessAssetTypeFromPath(mockProjectAssetTypeManager, ["path", "to", `asset.${UNKNOWN_ASSET_EXTENSION}`]);
		assertEquals(result, null);
	},
});

Deno.test({
	name: "guessAssetTypeFromFile(), checks the path first",
	async fn() {
		const { mockProjectAssetTypeManager, mockBuiltInAssetManager, fileSystem } = getMocks();

		const result = await ProjectAsset.guessAssetTypeFromFile(mockBuiltInAssetManager, mockProjectAssetTypeManager, fileSystem, ["path", "to", `asset.${BASIC_ASSET_EXTENSION}`]);
		assertEquals(result, BASIC_PROJECTASSETTYPE);
	},
});

Deno.test({
	name: "guessAssetTypeFromFile(), reads json 'assetType' property from filesystem",
	async fn() {
		const { mockProjectAssetTypeManager, mockBuiltInAssetManager, fileSystem } = getMocks();
		const path = ["path", "to", "asset.json"];
		await fileSystem.writeJson(path, {
			assetType: BASIC_PROJECTASSETTYPE,
		});

		const result = await ProjectAsset.guessAssetTypeFromFile(mockBuiltInAssetManager, mockProjectAssetTypeManager, fileSystem, path);
		assertEquals(result, BASIC_PROJECTASSETTYPE);
	},
});

Deno.test({
	name: "guessAssetTypeFromFile(), is null if json fill doesn't contain an assetType property",
	async fn() {
		const { mockProjectAssetTypeManager, mockBuiltInAssetManager, fileSystem } = getMocks();
		const path = ["path", "to", "asset.json"];
		await fileSystem.writeJson(path, {});

		const result = await ProjectAsset.guessAssetTypeFromFile(mockBuiltInAssetManager, mockProjectAssetTypeManager, fileSystem, path);
		assertEquals(result, null);
	},
});
