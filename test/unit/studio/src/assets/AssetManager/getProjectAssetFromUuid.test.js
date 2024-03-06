import "../../../shared/initializeStudio.js";
import { assertEquals, assertExists, assertRejects } from "std/testing/asserts.ts";
import { ProjectAssetTypeEntity } from "../../../../../../studio/src/assets/projectAssetType/ProjectAssetTypeEntity.js";
import { ProjectAssetTypeMaterial } from "../../../../../../studio/src/assets/projectAssetType/ProjectAssetTypeMaterial.js";
import { injectMockStudioInstance } from "../../../../../../studio/src/studioInstance.js";
import { assertIsType, testTypes } from "../../../../shared/typeAssertions.js";
import { createMockProjectAssetType } from "../../../shared/createMockProjectAssetType.js";
import { BASIC_ASSET_PATH, BASIC_ASSET_UUID, BASIC_PROJECTASSETTYPE, NONEXISTENT_ASSET_UUID, NONEXISTENT_PROJECTASSETTYPE, basicSetup } from "./shared.js";

injectMockStudioInstance(/** @type {any} */ ({}));

Deno.test({
	name: "getProjectAssetFromUuid()",
	async fn() {
		const { assetManager } = await basicSetup();

		const asset = await assetManager.getProjectAssetFromUuid(BASIC_ASSET_UUID);

		assertExists(asset);
	},
});

Deno.test({
	name: "getProjectAssetFromUuid() non existent",
	async fn() {
		const { assetManager } = await basicSetup();

		const asset = await assetManager.getProjectAssetFromUuid(NONEXISTENT_ASSET_UUID);

		assertEquals(asset, null);
	},
});

Deno.test({
	name: "getProjectAssetFromUuid() non existent, assertExists true",
	async fn() {
		const { assetManager } = await basicSetup();

		await assertRejects(async () => {
			await assetManager.getProjectAssetFromUuid(NONEXISTENT_ASSET_UUID, {
				assertExists: true,
			});
		}, Error, `Failed to get project asset, no asset with uuid "${NONEXISTENT_ASSET_UUID}" exists.`);
	},
});

Deno.test({
	name: "getProjectAssetFromUuid() assert asset type, valid asset type",
	async fn() {
		const { assetManager, ProjectAssetType } = await basicSetup();

		const asset = await assetManager.getProjectAssetFromUuid(BASIC_ASSET_UUID, {
			assertAssetType: ProjectAssetType,
		});

		assertExists(asset);
	},
});

Deno.test({
	name: "getProjectAssetFromUuid() assert asset type array, valid asset type",
	async fn() {
		const { assetManager, ProjectAssetType } = await basicSetup();
		const { ProjectAssetType: SecondProjectAssetType } = createMockProjectAssetType("test:secondProjectAssetType");

		const asset = await assetManager.getProjectAssetFromUuid(BASIC_ASSET_UUID, {
			assertAssetType: [ProjectAssetType, SecondProjectAssetType],
		});

		assertExists(asset);
	},
});

Deno.test({
	name: "getProjectAssetFromUuid() assert asset type, invalid asset type",
	async fn() {
		const { assetManager } = await basicSetup();

		const { ProjectAssetType: ExpectedProjectAssetType } = createMockProjectAssetType("namespace:expected");

		await assertRejects(async () => {
			await assetManager.getProjectAssetFromUuid(BASIC_ASSET_UUID, {
				assertAssetType: ExpectedProjectAssetType,
			});
		}, Error, `Unexpected asset type while getting project asset. Expected "namespace:expected" but got "${BASIC_PROJECTASSETTYPE}".`);
	},
});

Deno.test({
	name: "getProjectAssetFromUuid() assert asset type array, invalid asset type",
	async fn() {
		const { assetManager } = await basicSetup();

		const { ProjectAssetType: ExpectedProjectAssetType1 } = createMockProjectAssetType("namespace:expected1");
		const { ProjectAssetType: ExpectedProjectAssetType2 } = createMockProjectAssetType("namespace:expected2");
		const { ProjectAssetType: ExpectedProjectAssetType3 } = createMockProjectAssetType("namespace:expected3");

		await assertRejects(async () => {
			await assetManager.getProjectAssetFromUuid(BASIC_ASSET_UUID, {
				assertAssetType: [ExpectedProjectAssetType1, ExpectedProjectAssetType2, ExpectedProjectAssetType3],
			});
		}, Error, `Unexpected asset type while getting project asset. Expected one of "namespace:expected1", "namespace:expected2" or "namespace:expected3" but got "${BASIC_PROJECTASSETTYPE}".`);
	},
});

Deno.test({
	name: "getProjectAssetFromUuid() assert asset type with empty array",
	async fn() {
		const { assetManager } = await basicSetup();

		await assertRejects(async () => {
			await assetManager.getProjectAssetFromUuid(BASIC_ASSET_UUID, {
				assertAssetType: [],
			});
		}, Error, "Failed to assert the asset type, an empty array was provided.");
	},
});

Deno.test({
	name: "getProjectAssetFromUuid() assert asset type, no asset type",
	async fn() {
		const { assetManager } = await basicSetup({
			stubAssets: [
				{
					uuid: BASIC_ASSET_UUID,
					assetType: NONEXISTENT_PROJECTASSETTYPE,
					path: BASIC_ASSET_PATH,
				},
			],
		});

		class ExpectedProjectAssetType {
			static type = "namespace:expected";
		}

		await assertRejects(async () => {
			await assetManager.getProjectAssetFromUuid(BASIC_ASSET_UUID, {
				assertAssetType: /** @type {any} */ (ExpectedProjectAssetType),
			});
		}, Error, `Unexpected asset type while getting project asset. Expected "namespace:expected" but got "none".`);
	},
});

testTypes({
	name: "getProjectAssetFromUuid() has the correct return type",
	async fn() {
		const { assetManager } = await basicSetup();
		const projectAssetUnknown = /** @type {import("../../../../../../studio/src/assets/ProjectAsset.js").ProjectAsset<import("../../../../../../studio/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetTypeUnknown>} */ ({});
		const projectAssetUnknownOrNull = /** @type {import("../../../../../../studio/src/assets/ProjectAsset.js").ProjectAsset<import("../../../../../../studio/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetTypeUnknown>?} */ ({});
		const projectAssetMaterial = /** @type {import("../../../../../../studio/src/assets/ProjectAsset.js").ProjectAsset<ProjectAssetTypeMaterial>} */ ({});
		const projectAssetMaterialOrNull = /** @type {typeof projectAssetMaterial | null} */ ({});
		const projectAssetEntity = /** @type {import("../../../../../../studio/src/assets/ProjectAsset.js").ProjectAsset<ProjectAssetTypeEntity>} */ ({});
		const projectAssetEntityOrMaterial = /** @type {import("../../../../../../studio/src/assets/ProjectAsset.js").ProjectAsset<ProjectAssetTypeMaterial | ProjectAssetTypeEntity>} */ ({});

		// Default assertions
		const asset1 = await assetManager.getProjectAssetFromUuid(BASIC_ASSET_UUID);
		assertIsType(projectAssetUnknownOrNull, asset1);
		assertIsType(asset1, null);
		assertIsType(asset1, projectAssetUnknown);
		// @ts-expect-error Verify that the type isn't 'any'
		assertIsType(true, asset1);

		// assertExists true
		const asset2 = await assetManager.getProjectAssetFromUuid(BASIC_ASSET_UUID, {
			assertExists: true,
		});
		assertIsType(projectAssetUnknown, asset2);
		// @ts-expect-error Verify that the type isn't 'any'
		assertIsType(true, asset2);

		// assertAssetType material
		const asset3 = await assetManager.getProjectAssetFromUuid(BASIC_ASSET_UUID, {
			assertAssetType: [ProjectAssetTypeMaterial],
			assertExists: true,
		});
		assertIsType(projectAssetMaterial, asset3);
		// @ts-expect-error Verify that the type isn't 'any'
		assertIsType(true, asset3);

		// assertAssetType material or null
		const asset4 = await assetManager.getProjectAssetFromUuid(BASIC_ASSET_UUID, {
			assertAssetType: ProjectAssetTypeMaterial,
		});
		assertIsType(projectAssetMaterialOrNull, asset4);
		assertIsType(asset4, null);
		assertIsType(asset4, projectAssetMaterial);
		// @ts-expect-error Verify that the type isn't 'any'
		assertIsType(true, asset4);

		// assertAssetType material or entity
		const asset5 = await assetManager.getProjectAssetFromUuid(BASIC_ASSET_UUID, {
			assertAssetType: [ProjectAssetTypeMaterial, ProjectAssetTypeEntity],
			assertExists: true,
		});
		assertIsType(projectAssetEntityOrMaterial, asset5);
		assertIsType(asset5, projectAssetMaterial);
		assertIsType(asset5, projectAssetEntity);
		// @ts-expect-error Verify that the type isn't 'any'
		assertIsType(true, asset5);
	},
});
