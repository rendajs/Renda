import {assertEquals} from "std/testing/asserts.ts";
import {stub} from "std/testing/mock.ts";
import {injectMockEditorInstance} from "../../../../../../editor/src/editorInstance.js";
import {BASIC_ASSET_UUID, BASIC_PROJECTASSETTYPE, basicSetup} from "./shared.js";

/**
 * @typedef StubReferenceAssetConfig
 * @property {import("../../../../../../src/mod.js").UuidString} uuid
 * @property {import("../../../../../../src/mod.js").UuidString[]} children
 */

/**
 * @typedef ReferencesTestConfig
 * @property {Parameters<typeof import("../../../../../../editor/src/assets/AssetManager.js").AssetManager.prototype.collectAllAssetReferences>} args
 * @property {import("../../../../../../src/mod.js").UuidString[]?} assertResult
 */

/**
 * @param {Object} options
 * @param {StubReferenceAssetConfig[]} [options.stubReferenceAssets]
 * @param {ReferencesTestConfig[]} [options.tests]
 */
async function basicSetupForReferences({
	stubReferenceAssets = [],
	tests = [],
} = {}) {
	injectMockEditorInstance(/** @type {any} */ ({}));

	/** @type {import("./shared.js").StubAssetConfig[]} */
	const stubAssets = [];
	let pathIndex = 0;
	for (const {uuid, children} of stubReferenceAssets) {
		const path = ["path", "to", `asset-${pathIndex++}.json`];
		stubAssets.push({
			uuid,
			path,
			assetType: BASIC_PROJECTASSETTYPE,
			jsonContent: {
				children,
			},
		});
	}
	const {assetManager, ProjectAssetType} = await basicSetup({stubAssets});

	stub(ProjectAssetType.prototype, "getReferencedAssetUuids", async function *() {
		// eslint-disable-next-line no-invalid-this
		const assetData = await this.projectAsset.readAssetData();
		for (const child of assetData.children) {
			yield child;
		}
	});

	function uninstall() {
		injectMockEditorInstance(null);
	}

	try {
		for (const {args, assertResult} of tests) {
			/** @type {import("../../../../../../src/mod.js").UuidString[]} */
			const results = [];
			for await (const result of assetManager.collectAllAssetReferences(...args)) {
				results.push(result);
			}
			assertEquals(results, assertResult);
		}
	} finally {
		uninstall();
	}

	return {
		assetManager,
		uninstall,
	};
}

Deno.test({
	name: "Basic usage",
	async fn() {
		await basicSetupForReferences({
			stubReferenceAssets: [
				{
					uuid: BASIC_ASSET_UUID,
					children: [],
				},
			],
			tests: [
				{
					args: [[BASIC_ASSET_UUID]],
					assertResult: [BASIC_ASSET_UUID],
				},
			],
		});
	},
});

Deno.test({
	name: "An asset referencing another asset",
	async fn() {
		const SECOND_ASSET_UUID = "SECOND_ASSET_UUID";
		await basicSetupForReferences({
			stubReferenceAssets: [
				{
					uuid: BASIC_ASSET_UUID,
					children: [SECOND_ASSET_UUID],
				},
				{
					uuid: SECOND_ASSET_UUID,
					children: [],
				},
			],
			tests: [
				{
					args: [[BASIC_ASSET_UUID]],
					assertResult: [BASIC_ASSET_UUID, SECOND_ASSET_UUID],
				},
			],
		});
	},
});

Deno.test({
	name: "Excluding an asset",
	async fn() {
		const SECOND_ASSET_UUID = "SECOND_ASSET_UUID";
		const THIRD_ASSET_UUID = "THIRD_ASSET_UUID";
		await basicSetupForReferences({
			stubReferenceAssets: [
				{
					uuid: BASIC_ASSET_UUID,
					children: [SECOND_ASSET_UUID],
				},
				{
					uuid: SECOND_ASSET_UUID,
					children: [THIRD_ASSET_UUID],
				},
				{
					uuid: THIRD_ASSET_UUID,
					children: [],
				},
			],
			tests: [
				{
					args: [
						[BASIC_ASSET_UUID], {
							excludeUuids: new Set([SECOND_ASSET_UUID]),
						},
					],
					assertResult: [BASIC_ASSET_UUID, THIRD_ASSET_UUID],
				},
			],
		});
	},
});

Deno.test({
	name: "Excluding an asset recursively",
	async fn() {
		const SECOND_ASSET_UUID = "SECOND_ASSET_UUID";
		const THIRD_ASSET_UUID = "THIRD_ASSET_UUID";
		await basicSetupForReferences({
			stubReferenceAssets: [
				{
					uuid: BASIC_ASSET_UUID,
					children: [SECOND_ASSET_UUID],
				},
				{
					uuid: SECOND_ASSET_UUID,
					children: [THIRD_ASSET_UUID],
				},
				{
					uuid: THIRD_ASSET_UUID,
					children: [],
				},
			],
			tests: [
				{
					args: [
						[BASIC_ASSET_UUID], {
							excludeUuidsRecursive: new Set([SECOND_ASSET_UUID]),
						},
					],
					assertResult: [BASIC_ASSET_UUID],
				},
			],
		});
	},
});

Deno.test({
	name: "Circular references",
	async fn() {
		const SECOND_ASSET_UUID = "SECOND_ASSET_UUID";
		const THIRD_ASSET_UUID = "THIRD_ASSET_UUID";
		await basicSetupForReferences({
			stubReferenceAssets: [
				{
					uuid: BASIC_ASSET_UUID,
					children: [SECOND_ASSET_UUID],
				},
				{
					uuid: SECOND_ASSET_UUID,
					children: [THIRD_ASSET_UUID],
				},
				{
					uuid: THIRD_ASSET_UUID,
					children: [BASIC_ASSET_UUID],
				},
			],
			tests: [
				{
					args: [[BASIC_ASSET_UUID]],
					assertResult: [BASIC_ASSET_UUID, SECOND_ASSET_UUID, THIRD_ASSET_UUID],
				},
			],
		});
	},
});

Deno.test({
	name: "Multiple root assets",
	async fn() {
		const SECOND_ASSET_UUID = "SECOND_ASSET_UUID";
		const THIRD_ASSET_UUID = "THIRD_ASSET_UUID";
		const FOURTH_ASSET_UUID = "FOURTH_ASSET_UUID";
		await basicSetupForReferences({
			stubReferenceAssets: [
				{
					uuid: BASIC_ASSET_UUID,
					children: [SECOND_ASSET_UUID],
				},
				{
					uuid: SECOND_ASSET_UUID,
					children: [THIRD_ASSET_UUID],
				},
				{
					uuid: THIRD_ASSET_UUID,
					children: [FOURTH_ASSET_UUID],
				},
				{
					uuid: FOURTH_ASSET_UUID,
					children: [],
				},
			],
			tests: [
				{
					args: [[BASIC_ASSET_UUID, THIRD_ASSET_UUID]],
					assertResult: [BASIC_ASSET_UUID, SECOND_ASSET_UUID, THIRD_ASSET_UUID, FOURTH_ASSET_UUID],
				},
			],
		});
	},
});

Deno.test({
	name: "Multiple root assets, one is already referenced",
	async fn() {
		const SECOND_ASSET_UUID = "SECOND_ASSET_UUID";
		await basicSetupForReferences({
			stubReferenceAssets: [
				{
					uuid: BASIC_ASSET_UUID,
					children: [SECOND_ASSET_UUID],
				},
				{
					uuid: SECOND_ASSET_UUID,
					children: [],
				},
			],
			tests: [
				{
					args: [[BASIC_ASSET_UUID, SECOND_ASSET_UUID]],
					assertResult: [BASIC_ASSET_UUID, SECOND_ASSET_UUID],
				},
			],
		});
	},
});
