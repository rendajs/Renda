import {assert, assertEquals, assertExists, assertRejects, assertStrictEquals} from "std/testing/asserts.ts";
import {TaskGenerateServices} from "../../../../../../editor/src/tasks/task/TaskGenerateServices.js";
import {MemoryEditorFileSystem} from "../../../../../../editor/src/util/fileSystems/MemoryEditorFileSystem.js";
import {createMockProjectAsset} from "../../assets/shared/createMockProjectAsset.js";
import {createMockProjectAssetType} from "../../assets/shared/createMockProjectAssetType.js";

const BASIC_ASSET_UUID = "BASIC_ASSET_UUID";
const BASIC_ASSET_TYPE = "BASIC_ASSET_TYPE";
const SECOND_ASSET_UUID = "SECOND_ASSET_UUID";

const blobModule = `
	export class AssetLoader {
		constructor() {
			this.registeredLoaderTypes = [];
		}
		registerLoaderType(loaderType) {
			this.registeredLoaderTypes.push(loaderType);
			return new loaderType();
		}
	}
	export class BasicAssetTypeLoader {
		someMethodCalls = [];

		someMethod(...args) {
			this.someMethodCalls.push(args);
		}
	}

	export function getBar() {
		return "bar";
	}
`;
const blobModuleBlob = new Blob([blobModule], {type: "text/javascript"});
const blobModuleUrl = URL.createObjectURL(blobModuleBlob);

/**
 * @param {object} options
 * @param {string} [options.projectAssetTypeModuleSpecifier]
 * @param {import("../../../../../../editor/src/tasks/task/TaskGenerateServices.js").AssetLoaderTypeImportConfig} [options.importConfig]
 */
function basicSetup({
	projectAssetTypeModuleSpecifier,
	importConfig = {
		identifier: "BasicAssetTypeLoader",
	},
} = {}) {
	const mockFileSystem = new MemoryEditorFileSystem();
	const fileSystem = /** @type {import("../../../../../../editor/src/util/fileSystems/EditorFileSystem.js").EditorFileSystem} */ (mockFileSystem);

	const {ProjectAssetType} = createMockProjectAssetType(BASIC_ASSET_TYPE);
	ProjectAssetType.assetLoaderTypeImportConfig = importConfig;
	if (projectAssetTypeModuleSpecifier) {
		ProjectAssetType.assetLoaderTypeImportConfig.moduleSpecifier = projectAssetTypeModuleSpecifier;
	}

	const {projectAsset: basicAsset} = createMockProjectAsset();
	basicAsset.assetType = BASIC_ASSET_TYPE;
	const {projectAsset: secondAsset} = createMockProjectAsset();
	secondAsset.assetType = BASIC_ASSET_TYPE;

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
					if (uuid == BASIC_ASSET_UUID) {
						return basicAsset;
					} else if (uuid == SECOND_ASSET_UUID) {
						return secondAsset;
					}
					return null;
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
	 * @param {import("../../../../../../editor/src/tasks/task/Task.js").RunTaskReturn} runTaskResult
	 */
	function getScriptContent(runTaskResult) {
		assertExists(runTaskResult.writeAssets);
		assertEquals(runTaskResult.writeAssets.length, 1);
		const [writeAsset] = runTaskResult.writeAssets;
		assertEquals(writeAsset.path, ["out.js"]);
		assertEquals(writeAsset.assetType, "renda:javascript");
		assert(typeof writeAsset.fileData == "string");
		return writeAsset.fileData;
	}

	/**
	 * @param {import("../../../../../../editor/src/tasks/task/Task.js").RunTaskReturn} runTaskResult
	 */
	async function initializeServices(runTaskResult) {
		let code = getScriptContent(runTaskResult);
		code = code.replaceAll(`"renda"`, `"${blobModuleUrl}"`);
		const blob = new Blob([code], {type: "text/javascript"});
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
		basicAsset,
		secondAsset,
		fileSystem,
		mockFileSystem,
		mockEditor,
		getScriptContent,
		initializeServices,
	};
}

/**
 * @param {object} options
 * @param {import("../../../../../../src/mod.js").UuidString[]} [options.usedAssets]
 */
function createRunTaskOptions({
	usedAssets = [],
} = {}) {
	/** @type {import("../../../../../../editor/src/tasks/task/Task.js").RunTaskOptions<import("../../../../../../editor/src/tasks/task/TaskGenerateServices.js").TaskGenerateServicesConfig>} */
	const options = {
		config: {
			outputLocation: ["out.js"],
			usedAssets,
		},
		allowDiskWrites: false,
		async readAssetFromPath(path, opts) {
			return null;
		},
		async readAssetFromUuid(uuid, opts) {
			return null;
		},
		async runDependencyTaskAsset(uuid) {},
	};
	return options;
}

Deno.test({
	name: "Basic config",
	async fn() {
		const {task, initializeServices} = basicSetup();
		const runTaskResult = await task.runTask(createRunTaskOptions());

		const result = await initializeServices(runTaskResult);
		assertExists(result);
	},
});

Deno.test({
	name: "Throws when there is no asset manager",
	async fn() {
		const {task, mockEditor} = basicSetup();
		mockEditor.projectManager.assetManager = null;
		await assertRejects(async () => {
			await task.runTask(createRunTaskOptions({}));
		}, Error, "Failed to run task: no asset manager.");
	},
});

Deno.test({
	name: "Config with a used asset",
	async fn() {
		const {task, initializeServices} = basicSetup();
		const runTaskResult = await task.runTask(createRunTaskOptions({
			usedAssets: [BASIC_ASSET_UUID],
		}));

		const result = await initializeServices(runTaskResult);
		assertExists(result.assetLoader);
		assertEquals(result.assetLoader.registeredLoaderTypes.length, 1);
	},
});

Deno.test({
	name: "Config with a specific module specifier",
	async fn() {
		const {task, getScriptContent} = basicSetup({
			projectAssetTypeModuleSpecifier: "module-specifier",
		});
		const runTaskResult = await task.runTask(createRunTaskOptions({
			usedAssets: [BASIC_ASSET_UUID],
		}));

		const result = getScriptContent(runTaskResult);
		assert(result.includes("module-specifier"));
	},
});

Deno.test({
	name: "Asset type with extra import config",
	async fn() {
		let usedAssets = /** @type {import("../../../../../../editor/src/assets/ProjectAsset.js").ProjectAssetAny[]?} */ (null);
		const {task, basicAsset, secondAsset, initializeServices} = basicSetup({
			importConfig: {
				identifier: "BasicAssetTypeLoader",
				instanceIdentifier: "instanceIdentifier",
				extra(ctx) {
					usedAssets = ctx.usedAssets;
					ctx.addImport("getBar", "renda");
					return `instanceIdentifier.someMethod(getBar());`;
				},
			},
		});
		const runTaskResult = await task.runTask(createRunTaskOptions({
			usedAssets: [BASIC_ASSET_UUID, SECOND_ASSET_UUID],
		}));

		assertExists(usedAssets);
		assertEquals(usedAssets.length, 2);
		assertStrictEquals(usedAssets[0], basicAsset);
		assertStrictEquals(usedAssets[1], secondAsset);

		const result = await initializeServices(runTaskResult);
		assertExists(result.assetLoader);
		assertEquals(result.assetLoader.registeredLoaderTypes.length, 1);
		assertExists(result.instanceIdentifier);
		assertEquals(result.instanceIdentifier.someMethodCalls, [["bar"]]);
	},
});
