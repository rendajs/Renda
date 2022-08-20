import {assertEquals} from "std/testing/asserts.ts";
import {TaskBundleAssets} from "../../../../../../editor/src/tasks/task/TaskBundleAssets.js";
import {MemoryEditorFileSystem} from "../../../../../../editor/src/util/fileSystems/MemoryEditorFileSystem.js";
import {createMockProjectAsset} from "../../assets/shared/createMockProjectAsset.js";
import {stub} from "std/testing/mock.ts";
import {BinaryDecomposer} from "../../../../../../src/mod.js";

const BASIC_ASSET_UUID = "00000000-0000-0000-0000-000000000001";
const BASIC_ASSET_TYPE_UUID = "00000000-0000-0000-0000-000000000002";
const CHILD_ASSET_UUID = "00000000-0000-0000-0000-000000000003";

/**
 * @param {Object} options
 * @param {import("../../../../../../editor/src/assets/ProjectAsset.js").GetBundledAssetDataReturnType} [options.bundledAssetDataReturn]
 * @param {import("../../../../../../src/mod.js").UuidString?} [options.getAssetTypeUuidReturn]
 */
async function basicSetup({
	bundledAssetDataReturn = new Uint8Array([0, 1, 2, 3]).buffer,
	getAssetTypeUuidReturn = BASIC_ASSET_TYPE_UUID,
} = {}) {
	const fileSystem = new MemoryEditorFileSystem();

	const {projectAsset} = createMockProjectAsset();

	stub(projectAsset, "getAssetTypeUuid", async () => {
		return getAssetTypeUuidReturn;
	});

	stub(projectAsset, "getBundledAssetData", async (...args) => {
		return bundledAssetDataReturn;
	});

	const mockEditor = /** @type {import("../../../../../../editor/src/Editor.js").Editor} */ ({
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

/** @type {import("../../../../../../editor/src/tasks/task/Task.js").RunTaskOptions<import("../../../../../../editor/src/tasks/task/TaskBundleAssets.js").TaskBundleAssetsConfig>} */
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
	needsAllGeneratedAssets: false,
	async readAssetFromPath(path, opts) {
		return null;
	},
	async readAssetFromUuid(uuid, opts) {
		return null;
	},
};

/**
 * @typedef AssetChecks
 * @property {import("../../../../../../src/mod.js").UuidString} assetUuid
 * @property {import("../../../../../../src/mod.js").UuidString} assetTypeUuid
 * @property {number} assetLength
 * @property {number[]} assetData
 */

/**
 * Checks if a generated bundle has the correct data.
 * Only the first asset is checked.
 * @param {Object} options
 * @param {MemoryEditorFileSystem} options.fileSystem
 * @param {import("../../../../../../editor/src/util/fileSystems/EditorFileSystem.js").EditorFileSystemPath} [options.outFilePath]
 * @param {number} options.totalByteLength
 * @param {number} options.assetCount
 * @param {AssetChecks?} [options.assetChecks]
 */
async function basicBundleChecks({
	fileSystem,
	outFilePath = ["out.rbundle"],
	totalByteLength,
	assetCount,
	assetChecks = {
		assetUuid: BASIC_ASSET_UUID,
		assetTypeUuid: BASIC_ASSET_TYPE_UUID,
		assetLength: 4,
		assetData: [0, 1, 2, 3],
	},
}) {
	const outFile = await fileSystem.readFile(outFilePath);
	const outBuffer = await outFile.arrayBuffer();
	assertEquals(outBuffer.byteLength, totalByteLength);
	const decomposer = new BinaryDecomposer(outBuffer);

	const actualAssetCount = decomposer.getUint32();
	assertEquals(actualAssetCount, assetCount);

	if (assetChecks) {
		const assetUuid = decomposer.getUuid();
		assertEquals(assetUuid, assetChecks.assetUuid);

		const assetTypeUuid = decomposer.getUuid();
		assertEquals(assetTypeUuid, assetChecks.assetTypeUuid);

		const assetLength = decomposer.getUint32();
		assertEquals(assetLength, assetChecks.assetLength);

		const assetData = new Uint8Array(outBuffer, decomposer.cursor, assetLength);
		assertEquals(Array.from(assetData), assetChecks.assetData);
	}
}

Deno.test({
	name: "Empty bundle",
	async fn() {
		const {task, fileSystem, cleanup} = await basicSetup();
		try {
			await task.runTask({
				...basicRunTaskOptions,
				config: {
					assets: [],
					outputPath: ["out.rbundle"],
					excludeAssets: [],
					excludeAssetsRecursive: [],
				},
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
			await task.runTask(basicRunTaskOptions);

			await basicBundleChecks({
				fileSystem,
				totalByteLength: 44,
				assetCount: 1,
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

			await basicBundleChecks({
				fileSystem,
				totalByteLength: 80,
				assetCount: 2,
				assetChecks: null,
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

			await basicBundleChecks({
				fileSystem,
				totalByteLength: 44,
				assetCount: 1,
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

			await basicBundleChecks({
				fileSystem,
				totalByteLength: 44,
				assetCount: 1,
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

			await basicBundleChecks({
				fileSystem,
				totalByteLength: 40,
				assetCount: 1,
				assetChecks: {
					assetUuid: BASIC_ASSET_UUID,
					assetTypeUuid: BASIC_ASSET_TYPE_UUID,
					assetLength: 0,
					assetData: [],
				},
			});
		} finally {
			cleanup();
		}
	},
});
