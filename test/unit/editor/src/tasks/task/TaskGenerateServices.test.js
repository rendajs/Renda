import {assert, assertEquals, assertExists, assertRejects} from "std/testing/asserts.ts";
import {TaskGenerateServices} from "../../../../../../editor/src/tasks/task/TaskGenerateServices.js";
import {MemoryEditorFileSystem} from "../../../../../../editor/src/util/fileSystems/MemoryEditorFileSystem.js";
import {createMockProjectAsset} from "../../assets/shared/createMockProjectAsset.js";
import {createMockProjectAssetType} from "../../assets/shared/createMockProjectAssetType.js";

const BASIC_ASSET_UUID = "BASIC_ASSET_UUID";
const BASIC_ASSET_TYPE = "BASIC_ASSET_TYPE";

const blobModule = `
	export class AssetLoader {
		constructor() {
			this.registeredLoaderTypes = [];
		}
		registerLoaderType(loaderType) {
			this.registeredLoaderTypes.push(loaderType);
		}
	}
	export class BasicAssetTypeLoader {}
`;
const blobModuleBlob = new Blob([blobModule], {type: "text/javascript"});
const blobModuleUrl = URL.createObjectURL(blobModuleBlob);

/**
 * @param {Object} options
 * @param {string} [options.projectAssetTypeModuleSpecifier]
 */
function basicSetup({
	projectAssetTypeModuleSpecifier,
} = {}) {
	const mockFileSystem = new MemoryEditorFileSystem();
	const fileSystem = /** @type {import("../../../../../../editor/src/util/fileSystems/EditorFileSystem.js").EditorFileSystem} */ (mockFileSystem);

	const {ProjectAssetType} = createMockProjectAssetType(BASIC_ASSET_TYPE);
	ProjectAssetType.assetLoaderTypeImportConfig = {
		identifier: "BasicAssetTypeLoader",
	};
	if (projectAssetTypeModuleSpecifier) {
		ProjectAssetType.assetLoaderTypeImportConfig.moduleSpecifier = projectAssetTypeModuleSpecifier;
	}

	const mockEditor = /** @type {import("../../../../../../editor/src/Editor.js").Editor} */ ({
		projectManager: {
			currentProjectFileSystem: fileSystem,
			assetManager: {
				async *collectAllAssetReferences(assets, opts) {
					for (const uuid of assets) {
						yield uuid;
					}
				},
				async getProjectAssetFromUuid(uuid) {
					const {projectAsset} = createMockProjectAsset({});
					projectAsset.assetType = BASIC_ASSET_TYPE;
					return projectAsset;
				},
			},
		},
		projectAssetTypeManager: {
			getAssetType(type) {
				if (type == BASIC_ASSET_TYPE) {
					return ProjectAssetType;
				}
			},
		},
	});
	const task = new TaskGenerateServices(mockEditor);

	/**
	 * @param {import("../../../../../../editor/src/util/fileSystems/EditorFileSystem.js").EditorFileSystemPath} path
	 */
	async function initializeServices(path) {
		let text = await fileSystem.readText(path);
		text = text.replaceAll(`"renda"`, `"${blobModuleUrl}"`);
		const blob = new Blob([text], {type: "text/javascript"});
		const url = URL.createObjectURL(blob);
		try {
			const module = await import(url);
			return module.initializeServices();
		} finally {
			URL.revokeObjectURL(url);
		}
	}

	return {
		task,
		fileSystem,
		mockFileSystem,
		mockEditor,
		initializeServices,
	};
}

Deno.test({
	name: "Basic config",
	async fn() {
		const {task, initializeServices} = basicSetup();
		await task.runTask({
			outputLocation: ["out.js"],
			usedAssets: [],
		});

		const result = await initializeServices(["out.js"]);
		assertExists(result);
	},
});

Deno.test({
	name: "Throws when there is no filesystem",
	async fn() {
		const {task, mockEditor} = basicSetup();
		mockEditor.projectManager.currentProjectFileSystem = null;
		await assertRejects(async () => {
			await task.runTask({
				outputLocation: ["out.js"],
				usedAssets: [],
			});
		}, Error, "Failed to run task: no project file system.");
	},
});

Deno.test({
	name: "Throws when there is no asset manager",
	async fn() {
		const {task, mockEditor} = basicSetup();
		mockEditor.projectManager.assetManager = null;
		await assertRejects(async () => {
			await task.runTask({
				outputLocation: ["out.js"],
				usedAssets: [],
			});
		}, Error, "Failed to run task: no asset manager.");
	},
});

Deno.test({
	name: "Config with a used asset",
	async fn() {
		const {task, initializeServices} = basicSetup();
		await task.runTask({
			outputLocation: ["out.js"],
			usedAssets: [BASIC_ASSET_UUID],
		});

		const result = await initializeServices(["out.js"]);
		assertExists(result.assetLoader);
		assertEquals(result.assetLoader.registeredLoaderTypes.length, 1);
	},
});

Deno.test({
	name: "Config with a specific module specifier",
	async fn() {
		const {task, fileSystem} = basicSetup({
			projectAssetTypeModuleSpecifier: "module-specifier",
		});
		await task.runTask({
			outputLocation: ["out.js"],
			usedAssets: [BASIC_ASSET_UUID],
		});

		const result = await fileSystem.readText(["out.js"]);
		assert(result.includes("module-specifier"));
	},
});
