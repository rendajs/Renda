import {assertEquals, assertExists, assertInstanceOf} from "std/testing/asserts.ts";
import {TaskBundleAssets} from "../../../../../../studio/src/tasks/task/TaskBundleAssets.js";
import {MemoryStudioFileSystem} from "../../../../../../studio/src/util/fileSystems/MemoryStudioFileSystem.js";
import {createMockProjectAsset} from "../../../shared/createMockProjectAsset.js";
import {stub} from "std/testing/mock.ts";
import {BinaryDecomposer} from "../../../../../../src/mod.js";
import {getBasicRunTaskReadAssetOptions} from "./shared.js";

const BASIC_ASSET_UUID = "00000000-0000-0000-0000-000000000001";
const BASIC_ASSET_TYPE_UUID = "00000000-0000-0000-0000-000000000002";
const CHILD_ASSET_UUID = "00000000-0000-0000-0000-000000000003";

/**
 * @param {object} options
 * @param {import("../../../../../../studio/src/assets/ProjectAsset.js").GetBundledAssetDataReturnType} [options.bundledAssetDataReturn]
 * @param {import("../../../../../../src/mod.js").UuidString?} [options.getAssetTypeUuidReturn]
 */
async function basicSetup({
	bundledAssetDataReturn = new Uint8Array([0, 1, 2, 3]).buffer,
	getAssetTypeUuidReturn = BASIC_ASSET_TYPE_UUID,
} = {}) {
	const fileSystem = new MemoryStudioFileSystem();

	const {projectAsset} = createMockProjectAsset();

	stub(projectAsset, "getAssetTypeUuid", async () => {
		return getAssetTypeUuidReturn;
	});

	stub(projectAsset, "getBundledAssetData", async (...args) => {
		return bundledAssetDataReturn;
	});

	const mockEditor = /** @type {import("../../../../../../studio/src/Studio.js").Studio} */ ({
		projectManager: {
			currentProjectFileSystem: null,
			assetManager: {
				async *collectAllAssetReferences(assetUuids, opts) {
					if (assetUuids.length <= 0) return;
					for (const uuid of assetUuids) {
						yield uuid;
					}
					yield CHILD_ASSET_UUID;
				},
				async getProjectAssetFromUuid(uuid, opts) {
					if (uuid == BASIC_ASSET_UUID) {
						return projectAsset;
					}
					return null;
				},
			},
		},
	});
	mockEditor.projectManager.currentProjectFileSystem = fileSystem;

	const task = new TaskBundleAssets(mockEditor);

	return {
		task,
		fileSystem,
		cleanup() {
			task.worker.terminate();
		},
	};
}

/** @type {import("../../../../../../studio/src/tasks/task/Task.js").RunTaskOptions<import("../../../../../../studio/src/tasks/task/TaskBundleAssets.js").TaskBundleAssetsConfig>} */
const basicRunTaskOptions = {
	config: {
		assets: [
			{
				asset: BASIC_ASSET_UUID,
				includeChildren: false,
			},
		],
		outputPath: ["out.rbundle"],
		excludeAssets: [],
		excludeAssetsRecursive: [],
	},
	allowDiskWrites: true,
	...getBasicRunTaskReadAssetOptions(),
};

/**
 * @typedef AssetChecks
 * @property {import("../../../../../../src/mod.js").UuidString} assetUuid
 * @property {import("../../../../../../src/mod.js").UuidString} assetTypeUuid
 * @property {number} assetLength
 * @property {number[]} assetData
 */

/**
 * @typedef BundleChecks
 * @property {number} totalByteLength
 * @property {number} assetCount
 * @property {AssetChecks?} [assetChecks]
 */

/**
 * Checks if a generated bundle has the correct data.
 * Only the first asset is checked.
 * @param {ArrayBuffer} bundleBuffer
 * @param {BundleChecks} bundleChecks
 */
async function basicBundleChecks(bundleBuffer, {
	totalByteLength,
	assetCount,
	assetChecks = {
		assetUuid: BASIC_ASSET_UUID,
		assetTypeUuid: BASIC_ASSET_TYPE_UUID,
		assetLength: 4,
		assetData: [0, 1, 2, 3],
	},
}) {
	assertEquals(bundleBuffer.byteLength, totalByteLength);
	const decomposer = new BinaryDecomposer(bundleBuffer);

	const actualAssetCount = decomposer.getUint32();
	assertEquals(actualAssetCount, assetCount);

	if (assetChecks) {
		const assetUuid = decomposer.getUuid();
		assertEquals(assetUuid, assetChecks.assetUuid);

		const assetTypeUuid = decomposer.getUuid();
		assertEquals(assetTypeUuid, assetChecks.assetTypeUuid);

		const assetLength = decomposer.getUint32();
		assertEquals(assetLength, assetChecks.assetLength);

		const assetData = new Uint8Array(bundleBuffer, decomposer.cursor, assetLength);
		assertEquals(Array.from(assetData), assetChecks.assetData);
	}
}

/**
 * Checks if a generated bundle has the correct data on the provided `fileSystem`.
 * Only the first asset is checked.
 * @param {object} options
 * @param {MemoryStudioFileSystem} options.fileSystem
 * @param {import("../../../../../../studio/src/util/fileSystems/StudioFileSystem.js").StudioFileSystemPath} [options.outFilePath]
 * @param {BundleChecks} options.bundleChecks
 */
async function basicFileSystemBundleChecks({
	fileSystem,
	outFilePath = ["out.rbundle"],
	bundleChecks,
}) {
	const outFile = await fileSystem.readFile(outFilePath);
	const outBuffer = await outFile.arrayBuffer();
	await basicBundleChecks(outBuffer, bundleChecks);
}

Deno.test({
	name: "Empty bundle",
	async fn() {
		const {task, fileSystem, cleanup} = await basicSetup();
		try {
			const result = await task.runTask({
				...basicRunTaskOptions,
				config: {
					assets: [],
					outputPath: ["out.rbundle"],
					excludeAssets: [],
					excludeAssetsRecursive: [],
				},
			});

			assertEquals(result, {
				touchedPaths: [["out.rbundle"]],
			});
			const outFile = await fileSystem.readFile(["out.rbundle"]);
			const outBuffer = await outFile.arrayBuffer();
			assertEquals(outBuffer.byteLength, 4);
		} finally {
			cleanup();
		}
	},
});

Deno.test({
	name: "A single asset",
	async fn() {
		const {task, fileSystem, cleanup} = await basicSetup();
		try {
			const result = await task.runTask(basicRunTaskOptions);

			assertEquals(result, {
				touchedPaths: [["out.rbundle"]],
			});
			await basicFileSystemBundleChecks({
				fileSystem,
				bundleChecks: {
					totalByteLength: 44,
					assetCount: 1,
				},
			});
		} finally {
			cleanup();
		}
	},
});

Deno.test({
	name: "An asset with a child asset",
	async fn() {
		const {task, fileSystem, cleanup} = await basicSetup();
		try {
			await task.runTask({
				...basicRunTaskOptions,
				config: {
					assets: [
						{
							asset: BASIC_ASSET_UUID,
							includeChildren: true,
						},
					],
					outputPath: ["out.rbundle"],
					excludeAssets: [],
					excludeAssetsRecursive: [],
				},
			});

			await basicFileSystemBundleChecks({
				fileSystem,
				bundleChecks: {
					totalByteLength: 80,
					assetCount: 2,
					assetChecks: null,
				},
			});
		} finally {
			cleanup();
		}
	},
});

Deno.test({
	name: "getBundledAssetData() returns Blob",
	async fn() {
		const buffer = new Uint8Array([0, 1, 2, 3]);
		const blob = new Blob([buffer]);
		const {task, fileSystem, cleanup} = await basicSetup({
			bundledAssetDataReturn: blob,
		});
		try {
			await task.runTask(basicRunTaskOptions);

			await basicFileSystemBundleChecks({
				fileSystem,
				bundleChecks: {
					totalByteLength: 44,
					assetCount: 1,
				},
			});
		} finally {
			cleanup();
		}
	},
});

Deno.test({
	name: "getBundledAssetData() returns buffer view",
	async fn() {
		const buffer = new Uint8Array([0, 0, 0, 0, 0, 1, 2, 3]);
		const view = new Uint8Array(buffer.buffer, 4, 4);
		const {task, fileSystem, cleanup} = await basicSetup({
			bundledAssetDataReturn: view,
		});
		try {
			await task.runTask(basicRunTaskOptions);

			await basicFileSystemBundleChecks({
				fileSystem,
				bundleChecks: {
					totalByteLength: 44,
					assetCount: 1,
				},
			});
		} finally {
			cleanup();
		}
	},
});

Deno.test({
	name: "getBundledAssetData() returns null",
	async fn() {
		const {task, fileSystem, cleanup} = await basicSetup({
			bundledAssetDataReturn: null,
		});
		try {
			await task.runTask(basicRunTaskOptions);

			await basicFileSystemBundleChecks({
				fileSystem,
				bundleChecks: {
					totalByteLength: 40,
					assetCount: 1,
					assetChecks: {
						assetUuid: BASIC_ASSET_UUID,
						assetTypeUuid: BASIC_ASSET_TYPE_UUID,
						assetLength: 0,
						assetData: [],
					},
				},
			});
		} finally {
			cleanup();
		}
	},
});

Deno.test({
	name: "allowDiskWrites: false",
	async fn() {
		const {task, fileSystem, cleanup} = await basicSetup();
		try {
			const result = await task.runTask({
				...basicRunTaskOptions,
				config: {
					assets: [
						{
							asset: BASIC_ASSET_UUID,
							includeChildren: true,
						},
					],
					outputPath: ["out.rbundle"],
					excludeAssets: [],
					excludeAssetsRecursive: [],
				},
				allowDiskWrites: false,
			});
			assertEquals(result.touchedAssets, undefined);
			assertExists(result.writeAssets);
			assertEquals(result.writeAssets.length, 1);
			assertEquals(result.writeAssets[0].path, ["out.rbundle"]);
			assertEquals(result.writeAssets[0].assetType, undefined);
			assertInstanceOf(result.writeAssets[0].fileData, ArrayBuffer);

			await basicBundleChecks(result.writeAssets[0].fileData, {
				totalByteLength: 80,
				assetCount: 2,
				assetChecks: null,
			});

			const dir = await fileSystem.readDir([]);
			assertEquals(dir.files, []);
		} finally {
			cleanup();
		}
	},
});
