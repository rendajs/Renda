import {assertSpyCall, assertSpyCalls, stub} from "std/testing/mock.ts";
import {assertEquals, assertInstanceOf, assertRejects} from "std/testing/asserts.ts";
import {basicSetup} from "./shared.js";
import {AssetLoaderTypeGenericStructure, StorageType, binaryToObject} from "../../../../../../src/mod.js";
import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";
import {createMockKeyboardShortcutManager} from "../../../shared/mockKeyboardShortcutManager.js";

Deno.test({
	name: "getBundledAssetData(), custom createBundledAssetData() implementation",
	async fn() {
		const {projectAsset, mocks, uninstall} = basicSetup();
		const createBundledAssetDataSpy = stub(mocks.ProjectAssetType.prototype, "createBundledAssetData", async () => {
			return "return value";
		});

		try {
			const result = await projectAsset.getBundledAssetData({option: true});
			assertEquals(result, "return value");
			assertSpyCalls(createBundledAssetDataSpy, 1);
			assertSpyCall(createBundledAssetDataSpy, 0, {
				args: [{option: true}],
			});
		} finally {
			createBundledAssetDataSpy.restore();
			await uninstall();
		}
	},
});

Deno.test({
	name: "getBundledAssetData(), usedAssetLoaderType",
	async fn() {
		const {projectAsset, mocks, uninstall} = basicSetup();
		mocks.ProjectAssetType.prototype.createBundledAssetData = async () => null;

		try {
			const binarySerializationOpts = {
				structure: {
					num: StorageType.INT32,
					str: StorageType.STRING,
				},
				nameIds: {
					num: 1,
					str: 2,
				},
			};

			/**
			 * @extends {AssetLoaderTypeGenericStructure<typeof binarySerializationOpts>}
			 */
			class AssetLoaderType extends AssetLoaderTypeGenericStructure {
				static get binarySerializationOpts() {
					return binarySerializationOpts;
				}
			}

			mocks.ProjectAssetType.usedAssetLoaderType = AssetLoaderType;

			const binaryResult = await projectAsset.getBundledAssetData();
			assertInstanceOf(binaryResult, ArrayBuffer);

			const result = binaryToObject(binaryResult, binarySerializationOpts);

			assertEquals(result, {
				num: 42,
				str: "defaultBasicAssetDiskString",
			});
		} finally {
			await uninstall();
		}
	},
});

Deno.test({
	name: "getAssetTypeUuid()",
	async fn() {
		const {projectAsset, mocks, uninstall} = basicSetup();
		try {
			mocks.ProjectAssetType.typeUuid = "type uuid";

			const result = await projectAsset.getAssetTypeUuid();
			assertEquals(result, "type uuid");
		} finally {
			await uninstall();
		}
	},
});

Deno.test({
	name: "getBundledAssetData() throws when binarySerializationOpts is not implemented",
	async fn() {
		const {projectAsset, mocks, uninstall} = basicSetup();

		try {
			mocks.ProjectAssetType.prototype.createBundledAssetData = async () => null;

			/**
			 * @extends {AssetLoaderTypeGenericStructure<any>}
			 */
			class AssetLoaderType extends AssetLoaderTypeGenericStructure {
			}

			mocks.ProjectAssetType.usedAssetLoaderType = AssetLoaderType;

			await assertRejects(async () => {
				await projectAsset.getBundledAssetData();
			}, Error, "Failed to get bundled asset data. `binarySerializationOpts` is not implemented.");
		} finally {
			await uninstall();
		}
	},
});

Deno.test({
	name: "getBundledAssetData() reads raw asset data when all else fails",
	async fn() {
		const {projectAsset, mocks, uninstall} = basicSetup();
		try {
			mocks.ProjectAssetType.prototype.createBundledAssetData = async () => null;

			const result = await projectAsset.getBundledAssetData();
			assertInstanceOf(result, File);
			assertEquals(result.name, "asset.basicassetextension");
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "default values are filled using propertiesAssetContentStructure",
	async fn() {
		const {projectAsset, mocks, uninstall} = basicSetup();
		mocks.ProjectAssetType.prototype.createBundledAssetData = async () => null;
		installFakeDocument();

		const binarySerializationOpts = {
			structure: {
				num: StorageType.INT32,
				str: StorageType.STRING,
				missing: StorageType.INT8,
			},
			nameIds: {
				num: 1,
				str: 2,
				missing: 3,
			},
		};

		/**
		 * @extends {AssetLoaderTypeGenericStructure<typeof binarySerializationOpts>}
		 */
		class AssetLoaderType extends AssetLoaderTypeGenericStructure {
			static get binarySerializationOpts() {
				return binarySerializationOpts;
			}
		}

		mocks.ProjectAssetType.usedAssetLoaderType = AssetLoaderType;

		mocks.ProjectAssetType.propertiesAssetContentStructure = {
			num: {
				type: "number",
			},
			str: {
				type: "string",
			},
			missing: {
				type: "number",
				guiOpts: {
					defaultValue: 123,
				},
			},
		};

		mocks.ProjectAssetType.transformBundledAssetData = data => {
			data.str = "replaced";
			return data;
		};

		try {
			const binaryResult = await projectAsset.getBundledAssetData();
			assertInstanceOf(binaryResult, ArrayBuffer);

			const result = binaryToObject(binaryResult, binarySerializationOpts);

			assertEquals(result, {
				num: 42,
				str: "replaced",
				missing: 123,
			});
		} finally {
			uninstallFakeDocument();
			await uninstall();
		}
	},
});

Deno.test({
	name: "getReferencedAssetUuids() with an asset loader type set",
	async fn() {
		const {projectAsset, mocks, mockStudio, uninstall} = basicSetup();
		mocks.ProjectAssetType.prototype.createBundledAssetData = async () => null;
		installFakeDocument();

		const {keyboardShortcutManager} = createMockKeyboardShortcutManager();
		mockStudio.keyboardShortcutManager = keyboardShortcutManager;

		const binarySerializationOpts = {
			structure: {
				asset1: StorageType.ASSET_UUID,
				asset2: StorageType.ASSET_UUID,
			},
			nameIds: {
				asset1: 1,
				asset2: 2,
			},
		};

		/**
		 * @extends {AssetLoaderTypeGenericStructure<typeof binarySerializationOpts>}
		 */
		class AssetLoaderType extends AssetLoaderTypeGenericStructure {
			static get binarySerializationOpts() {
				return binarySerializationOpts;
			}
		}

		mocks.ProjectAssetType.usedAssetLoaderType = AssetLoaderType;

		mocks.ProjectAssetType.propertiesAssetContentStructure = {
			asset1: {
				type: "droppable",
				guiOpts: {
					defaultValue: "00000000-0000-0000-0000-000000000001",
				},
			},
			asset2: {
				type: "droppable",
			},
		};

		mocks.ProjectAssetType.transformBundledAssetData = data => {
			data.asset2 = "00000000-0000-0000-0000-000000000002";
			return data;
		};

		mocks.ProjectAssetType.prototype.getReferencedAssetUuids = async function *() {
			yield "00000000-0000-0000-0000-000000000003";
		};

		try {
			/** @type {(import("../../../../../../src/mod.js").UuidString | null | undefined)[]} */
			const result = [];
			for await (const uuid of projectAsset.getReferencedAssetUuids()) {
				result.push(uuid);
			}
			assertEquals(result, [
				// TODO: Change this once default values for droppable guis
				// are supported #272
				// "00000000-0000-0000-0000-000000000001",
				null,
				"00000000-0000-0000-0000-000000000002",
				"00000000-0000-0000-0000-000000000003",
			]);
		} finally {
			uninstallFakeDocument();
			await uninstall();
		}
	},
});
