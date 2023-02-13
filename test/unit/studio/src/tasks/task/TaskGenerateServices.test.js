import {assert, assertEquals, assertExists, assertRejects, assertStrictEquals} from "std/testing/asserts.ts";
import {TaskGenerateServices} from "../../../../../../studio/src/tasks/task/TaskGenerateServices.js";
import {MemoryStudioFileSystem} from "../../../../../../studio/src/util/fileSystems/MemoryStudioFileSystem.js";
import {createMockProjectAsset} from "../../../shared/createMockProjectAsset.js";
import {createMockProjectAssetType} from "../../../shared/createMockProjectAssetType.js";
import {getBasicRunTaskReadAssetOptions} from "./shared.js";

const BASIC_ASSET_UUID = "BASIC_ASSET_UUID";
const BASIC_ASSET_TYPE = "BASIC_ASSET_TYPE";
const SECOND_ASSET_UUID = "SECOND_ASSET_UUID";
const BASIC_ENTRY_POINT_UUID = "BASIC_ENTRY_POINT_UUID";

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
	export class EngineAssetsManager {}
	export class WebGpuRenderer {
		constructor(engineAssetsManager) {
			this.engineAssetsManager = engineAssetsManager;
			this.initCalled = false;
		}

		init() {
			this.initCalled = true;
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
 * @param {import("../../../../../../studio/src/tasks/task/TaskGenerateServices.js").AssetLoaderTypeImportConfig} [options.importConfig]
 * @param {string} [options.entryPointContent]
 */
function basicSetup({
	projectAssetTypeModuleSpecifier,
	importConfig = {
		identifier: "BasicAssetTypeLoader",
	},
	entryPointContent = "",
} = {}) {
	const mockFileSystem = new MemoryStudioFileSystem();
	const fileSystem = /** @type {import("../../../../../../studio/src/util/fileSystems/StudioFileSystem.js").StudioFileSystem} */ (mockFileSystem);

	const {ProjectAssetType} = createMockProjectAssetType(BASIC_ASSET_TYPE);
	ProjectAssetType.assetLoaderTypeImportConfig = importConfig;
	if (projectAssetTypeModuleSpecifier) {
		ProjectAssetType.assetLoaderTypeImportConfig.moduleSpecifier = projectAssetTypeModuleSpecifier;
	}

	const {projectAsset: basicAsset} = createMockProjectAsset();
	basicAsset.assetType = BASIC_ASSET_TYPE;
	const {projectAsset: secondAsset} = createMockProjectAsset();
	secondAsset.assetType = BASIC_ASSET_TYPE;
	const {projectAsset: entryPointAsset} = createMockProjectAsset({
		readAssetDataReturnValue: entryPointContent,
	});

	const mockEditor = /** @type {import("../../../../../../studio/src/Studio.js").Studio} */ ({
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
					} else if (uuid == BASIC_ENTRY_POINT_UUID) {
						return entryPointAsset;
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
			*getAssetTypeIds() {
				yield BASIC_ASSET_TYPE;
			},
		},
	});
	const task = new TaskGenerateServices(mockEditor);

	/**
	 * @param {import("../../../../../../studio/src/tasks/task/Task.js").RunTaskReturn<import("../../../../../../studio/src/tasks/task/TaskGenerateServices.js").TaskGenerateServicesCustomData>} runTaskResult
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
	 * @param {import("../../../../../../studio/src/tasks/task/Task.js").RunTaskReturn<import("../../../../../../studio/src/tasks/task/TaskGenerateServices.js").TaskGenerateServicesCustomData>} runTaskResult
	 */
	async function callInitializeServices(runTaskResult) {
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
		callInitializeServices,
	};
}

/**
 * @param {object} options
 * @param {import("../../../../../../src/mod.js").UuidString[]} [options.usedAssets]
 * @param {boolean} [options.includeAll]
 */
function createRunTaskOptions({
	usedAssets = [],
	includeAll = false,
} = {}) {
	/** @type {import("../../../../../../studio/src/tasks/task/Task.js").RunTaskOptions<import("../../../../../../studio/src/tasks/task/TaskGenerateServices.js").TaskGenerateServicesConfig>} */
	const options = {
		config: {
			outputLocation: ["out.js"],
			usedAssets,
			entryPoints: [BASIC_ENTRY_POINT_UUID],
			includeAll,
		},
		allowDiskWrites: false,
		...getBasicRunTaskReadAssetOptions(),
	};
	return options;
}

Deno.test({
	name: "initializeServices is empty by default",
	async fn() {
		const {task, callInitializeServices} = basicSetup();
		const runTaskResult = await task.runTask(createRunTaskOptions());

		const result = await callInitializeServices(runTaskResult);
		assertEquals(result, {});
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
		const {task, callInitializeServices} = basicSetup({
			entryPointContent: `
				import {initializeServices} from "renda:services";
				const {assetLoader} = initializeServices();
			`,
		});
		const runTaskResult = await task.runTask(createRunTaskOptions({
			usedAssets: [BASIC_ASSET_UUID],
		}));

		const result = await callInitializeServices(runTaskResult);
		assertExists(result.assetLoader);
		assertEquals(result.assetLoader.registeredLoaderTypes.length, 1);
	},
});

Deno.test({
	name: "Config with a specific module specifier",
	async fn() {
		const {task, getScriptContent} = basicSetup({
			projectAssetTypeModuleSpecifier: "module-specifier",
			entryPointContent: `
				import {initializeServices} from "renda:services";
				const {assetLoader} = initializeServices();
			`,
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
		let usedAssets = /** @type {import("../../../../../../studio/src/assets/ProjectAsset.js").ProjectAssetAny[]?} */ (null);
		const {task, basicAsset, secondAsset, callInitializeServices} = basicSetup({
			importConfig: {
				identifier: "BasicAssetTypeLoader",
				instanceIdentifier: "instanceIdentifier",
				extra(ctx) {
					usedAssets = ctx.usedAssets;
					ctx.addImport("getBar", "renda");
					return `instanceIdentifier.someMethod(getBar());`;
				},
			},
			entryPointContent: `
				import {initializeServices} from "renda:services";
				const {assetLoader} = initializeServices();
			`,
		});
		const runTaskResult = await task.runTask(createRunTaskOptions({
			usedAssets: [BASIC_ASSET_UUID, SECOND_ASSET_UUID],
		}));

		assertExists(usedAssets);
		assertEquals(usedAssets.length, 2);
		assertStrictEquals(usedAssets[0], basicAsset);
		assertStrictEquals(usedAssets[1], secondAsset);

		const result = await callInitializeServices(runTaskResult);
		assertExists(result.assetLoader);
		assertEquals(result.assetLoader.registeredLoaderTypes.length, 1);
		assertExists(result.instanceIdentifier);
		assertEquals(result.instanceIdentifier.someMethodCalls, [["bar"]]);
	},
});

Deno.test({
	name: "initialize renderer",
	async fn() {
		const {task, callInitializeServices} = basicSetup({
			entryPointContent: `
			import {initializeServices} from "renda:services";
			const {renderer} = initializeServices();
		`,
		});
		const runTaskResult = await task.runTask(createRunTaskOptions());
		const result = await callInitializeServices(runTaskResult);

		assertExists(result);
		assertExists(result.renderer);
		assertExists(result.renderer.engineAssetsManager);
	},
});

Deno.test({
	name: "includeAll",
	async fn() {
		let extraCalled = false;
		const {task, callInitializeServices} = basicSetup({
			importConfig: {
				identifier: "BasicAssetTypeLoader",
				extra(ctx) {
					extraCalled = true;
					assertEquals(ctx.includeAll, true);
					return "";
				},
			},
		});

		const runTaskResult = await task.runTask(createRunTaskOptions({
			includeAll: true,
		}));
		const result = await callInitializeServices(runTaskResult);

		assertExists(result);
		assertExists(result.assetLoader);
		assertEquals(result.assetLoader.registeredLoaderTypes.length, 1);
		assertEquals(extraCalled, true);
		assertExists(result.engineAssetsManager);
		assertExists(result.renderer);
		assertExists(result.renderer.engineAssetsManager);
	},
});
