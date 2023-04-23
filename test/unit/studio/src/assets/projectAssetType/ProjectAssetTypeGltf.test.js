import "../../../shared/initializeStudio.js";
import {ProjectAssetTypeGltf} from "../../../../../../studio/src/assets/projectAssetType/ProjectAssetTypeGltf.js";
import {createMockDependencies} from "./shared.js";
import {assertExists, assertRejects} from "std/testing/asserts.ts";

Deno.test({
	name: "getLiveAssetData() with a gltf file",
	async fn() {
		const {projectAssetTypeArgs, projectAsset} = createMockDependencies();

		/** @type {import("../../../../../../src/util/gltf/types.js").GltfJsonData} */
		const json = {
			asset: {version: "2.0"},
			scenes: [
				{
					nodes: [0],
				},
			],
			nodes: [
				{
					name: "Node",
				},
			],
		};
		const jsonStr = JSON.stringify(json);
		const blob = new Blob([jsonStr], {type: ""});
		projectAsset.path = ["path", "to", "file.gltf"];

		const projectAssetType = new ProjectAssetTypeGltf(...projectAssetTypeArgs);
		const result = await projectAssetType.getLiveAssetData(blob);

		assertExists(result.liveAsset);
	},
});

Deno.test({
	name: "getLiveAssetData() with a glb file that doesn't contain gltf data",
	async fn() {
		const {projectAssetTypeArgs, projectAsset} = createMockDependencies();

		const blob = new Blob(["not gltf data"], {type: ""});
		projectAsset.path = ["path", "to", "file.glb"];

		const projectAssetType = new ProjectAssetTypeGltf(...projectAssetTypeArgs);
		// The spec states that gltf files should contain pure json data
		// and glb files should have the binary container format.
		// So we'll throw here even if the file contains valid gltf json data.
		// If a file contains valid json but has a .glb extension, something
		// went wrong somewhere and we'll throw just to be sure.
		await assertRejects(async () => {
			await projectAssetType.getLiveAssetData(blob);
		}, Error, "The provided file doesn't have a valid glTF format.");
	},
});
