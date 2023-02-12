import "../../../shared/initializeEditor.js";
import {assertEquals, assertExists, assertRejects} from "std/testing/asserts.ts";
import {ProjectAssetTypeEntity} from "../../../../../../editor/src/assets/projectAssetType/ProjectAssetTypeEntity.js";
import {ProjectAssetTypeMaterial} from "../../../../../../editor/src/assets/projectAssetType/ProjectAssetTypeMaterial.js";
import {injectMockEditorInstance} from "../../../../../../editor/src/editorInstance.js";
import {assertIsType} from "../../../../shared/typeAssertions.js";
import {createMockProjectAssetType} from "../shared/createMockProjectAssetType.js";
import {BASIC_ASSET_PATH, BASIC_PROJECTASSETTYPE, NON_EXISTENT_ASSET_PATH, basicSetup} from "./shared.js";

injectMockEditorInstance(/** @type {any} */ ({}));

Deno.test({
	name: "getProjectAssetFromPath()",
	async fn() {
		const {assetManager} = await basicSetup();

		const result = await assetManager.getProjectAssetFromPath(BASIC_ASSET_PATH);

		assertExists(result);
	},
});

Deno.test({
	name: "getProjectAssetFromPath() non existent",
	async fn() {
		const {assetManager} = await basicSetup();

		const result = await assetManager.getProjectAssetFromPath(NON_EXISTENT_ASSET_PATH);

		assertEquals(result, null);
	},
});

Deno.test({
	name: "getProjectAssetFromPath() non existent, assertExists true",
	async fn() {
		const {assetManager} = await basicSetup();

		await assertRejects(async () => {
			await assetManager.getProjectAssetFromPath(NON_EXISTENT_ASSET_PATH, {
				assertionOptions: {
					assertExists: true,
				},
			});
		}, Error, `Failed to get project asset from "path/to/nonexistent/asset.json" because it wasn't found.`);
	},
});

Deno.test({
	name: "getProjectAssetFromPath() assert asset type, valid asset type",
	async fn() {
		const {assetManager, ProjectAssetType} = await basicSetup();

		const asset = await assetManager.getProjectAssetFromPath(BASIC_ASSET_PATH, {
			assertionOptions: {
				assertAssetType: ProjectAssetType,
			},
		});

		assertExists(asset);
	},
});

Deno.test({
	name: "getProjectAssetFromPath() assert asset type, invalid asset type",
	async fn() {
		const {assetManager} = await basicSetup();

		const {ProjectAssetType: ExpectedProjectAssetType} = createMockProjectAssetType("namespace:expected");

		await assertRejects(async () => {
			await assetManager.getProjectAssetFromPath(BASIC_ASSET_PATH, {
				assertionOptions: {
					assertAssetType: ExpectedProjectAssetType,
				},
			});
		}, Error, `Unexpected asset type while getting project asset. Expected "namespace:expected" but got "${BASIC_PROJECTASSETTYPE}".`);
	},
});

Deno.test({
	name: "getProjectAssetFromPath() with registerIfNecessary false",
	async fn() {
		const {assetManager, mockFileSystem} = await basicSetup();

		mockFileSystem.writeFile(NON_EXISTENT_ASSET_PATH, "test");

		const result1 = await assetManager.getProjectAssetFromPath(NON_EXISTENT_ASSET_PATH, {
			registerIfNecessary: false,
		});
		assertEquals(result1, null);

		await assertRejects(async () => {
			await assetManager.getProjectAssetFromPath(NON_EXISTENT_ASSET_PATH, {
				registerIfNecessary: false,
				assertionOptions: {
					assertExists: true,
				},
			});
		}, Error, `Failed to get project asset from "path/to/nonexistent/asset.json" because it wasn't found.`);

		const result2 = await assetManager.getProjectAssetFromPath(NON_EXISTENT_ASSET_PATH);
		assertExists(result2);
	},
});

// No runtime behaviour is being tested here, only types.
// eslint-disable-next-line no-unused-vars
async function testTypes() {
	const {assetManager} = await basicSetup();
	const projectAssetUnknown = /** @type {import("../../../../../../editor/src/assets/ProjectAsset.js").ProjectAsset<import("../../../../../../editor/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetTypeUnknown>} */ ({});
	const projectAssetUnknownOrNull = /** @type {import("../../../../../../editor/src/assets/ProjectAsset.js").ProjectAsset<import("../../../../../../editor/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetTypeUnknown>?} */ ({});
	const projectAssetMaterial = /** @type {import("../../../../../../editor/src/assets/ProjectAsset.js").ProjectAsset<ProjectAssetTypeMaterial>} */ ({});
	const projectAssetMaterialOrNull = /** @type {typeof projectAssetMaterial | null} */ ({});
	const projectAssetEntity = /** @type {import("../../../../../../editor/src/assets/ProjectAsset.js").ProjectAsset<ProjectAssetTypeEntity>} */ ({});
	const projectAssetEntityOrMaterial = /** @type {import("../../../../../../editor/src/assets/ProjectAsset.js").ProjectAsset<ProjectAssetTypeMaterial | ProjectAssetTypeEntity>} */ ({});

	// Default assertions
	const asset1 = await assetManager.getProjectAssetFromPath(BASIC_ASSET_PATH);
	assertIsType(projectAssetUnknownOrNull, asset1);
	assertIsType(asset1, null);
	assertIsType(asset1, projectAssetUnknown);
	// @ts-expect-error Verify that the type isn't 'any'
	assertIsType(true, asset1);

	// assertExists true
	const asset2 = await assetManager.getProjectAssetFromPath(BASIC_ASSET_PATH, {
		assertionOptions: {
			assertExists: true,
		},
	});
	assertIsType(projectAssetUnknown, asset2);
	// @ts-expect-error Verify that the type isn't 'any'
	assertIsType(true, asset2);

	// assertAssetType material
	const asset3 = await assetManager.getProjectAssetFromPath(BASIC_ASSET_PATH, {
		assertionOptions: {
			assertAssetType: [ProjectAssetTypeMaterial],
			assertExists: true,
		},
	});
	assertIsType(projectAssetMaterial, asset3);
	// @ts-expect-error Verify that the type isn't 'any'
	assertIsType(true, asset3);

	// assertAssetType material or null
	const asset4 = await assetManager.getProjectAssetFromPath(BASIC_ASSET_PATH, {
		assertionOptions: {
			assertAssetType: ProjectAssetTypeMaterial,
		},
	});
	assertIsType(projectAssetMaterialOrNull, asset4);
	assertIsType(asset4, null);
	assertIsType(asset4, projectAssetMaterial);
	// @ts-expect-error Verify that the type isn't 'any'
	assertIsType(true, asset4);

	// assertAssetType material or entity
	const asset5 = await assetManager.getProjectAssetFromPath(BASIC_ASSET_PATH, {
		assertionOptions: {
			assertAssetType: [ProjectAssetTypeMaterial, ProjectAssetTypeEntity],
			assertExists: true,
		},
	});
	assertIsType(projectAssetEntityOrMaterial, asset5);
	assertIsType(asset5, projectAssetMaterial);
	assertIsType(asset5, projectAssetEntity);
	// @ts-expect-error Verify that the type isn't 'any'
	assertIsType(true, asset5);
}
