import {CLUSTER_BOUNDS_SHADER_ASSET_UUID, CLUSTER_LIGHTS_SHADER_ASSET_UUID} from "../../../../src/mod.js";
import {ProjectAssetTypeJavascript} from "../../assets/projectAssetType/ProjectAssetTypeJavascript.js";
import {createTreeViewStructure} from "../../ui/propertiesTreeView/createStructureHelpers.js";
import {Task} from "./Task.js";

/**
 * @fileoverview A task that generates a services script that can be used by the user
 * to easily perform some actions that would otherwise require boilerplate code.
 * The generated script mainly takes care of creating an asset loader that registers
 * the required asset types. The generation of the script can be configured to only
 * import modules that are actually necessary, that way tree shaking can get rid of
 * unused code.
 */

/**
 * @typedef TaskGenerateServicesConfig
 * @property {import("../../util/fileSystems/EditorFileSystem.js").EditorFileSystemPath} outputLocation
 * @property {import("../../../../src/mod.js").UuidString[]} usedAssets A list of
 * asset uuids that are expected to be loaded. The task uses this list to determine
 * which asset loader types should be included. This way, loader types that are
 * not needed are not included when bundling with tree shaking enabled.
 * @property {import("../../../../src/mod.js").UuidString[]} entryPoints A list of
 * JavaScript asset uuids that will be using the generated services file. It is used to
 * analyse which services are actually used so that any unused services can be omitted
 * from the generation.
 * @property {boolean} [includeAll] When set, the generated services script includes
 * all code that can possibly be generated, regardless of what assets and entrypoints
 * have been provided. This is useful during development, when you just want to quickly
 * generate a services script without having to wait for the task to check which parts
 * are needed. However, since this causes a lot of things to be imported, it is not advised
 * to use this in production builds.
 */

/**
 * @template {import("../../assets/projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny} [TProjectAssetType = any]
 * @typedef AssetLoaderTypeImportConfig
 * @property {string} identifier The identifier to import and pass to `registerLoaderType`.
 * @property {string} [moduleSpecifier] The module specifier to import from, this defaults to "renda".
 * @property {string} [instanceIdentifier] When set, the result of the `assetLoader.registerLoaderType()` call will
 * be stored in a variable with this identifier that you can use using `extra`.
 * For example, setting this to `shaderLoader` will result in:
 * ```js
 * const shaderLoader = assetLoader.registerLoaderType(AssetLoaderTypeShaderSource);
 * ```
 * rather than just
 * ```js
 * assetLoader.registerLoaderType(AssetLoaderTypeShaderSource);
 * ```
 * @property {boolean} [returnInstanceIdentifier] When set to true (which is the default), the created variable
 * from `instanceIdentifier` will be returned from the `initializeServices()` function.
 * This only has an effect when `instanceIdentifier` is set.
 * @property {(ctx: AssetLoaderTypeImportConfigExtraContext<TProjectAssetType>) => (Promise<string> | string)} [extra]
 * A function that gets called in which you can add extra content below the registration of the loader type.
 */

/**
 * @template {import("../../assets/projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny} TProjectAssetType
 * @typedef AssetLoaderTypeImportConfigExtraContext
 * @property {import("../../Studio.js").Studio} editor The editor instance.
 * @property {(identifier: string, moduleSpecifier: string) => void} addImport Call this function to add extra
 * imports to the top of the file. For example:
 * ```js
 * ctx.addImport("ShaderBuilder", "renda");
 * ```
 * will add `import {ShaderBuilder} from "renda";` to the top of the file.
 * @property {import("../../assets/ProjectAsset.js").ProjectAsset<TProjectAssetType>[]} usedAssets A list of assets that will have
 * been provided by the user in the task config. This list only contains the asset that are of the type related
 * to the current ProjectAssetType config.
 * @property {boolean} includeAll If this is true, the task was run with the includeAll flag set. In this case
 * you should try to include as much of your generated code as possible, even though `usedAssets` might be an empty array.
 */

/**
 * @typedef TaskGenerateServicesCustomData
 * @property {import("../../../../src/mod.js").UuidString[]} usedAssets
 */

/** @extends {Task<TaskGenerateServicesConfig, TaskGenerateServicesCustomData>} */
export class TaskGenerateServices extends Task {
	static uiName = "Generate Services";
	static type = "renda:generateServices";

	static configStructure = createTreeViewStructure({
		entryPoints: {
			type: "array",
			tooltip: "A list of script files that is checked for usage of the generated services. Some parts of the generated services script are omitted depending on usage, in order to reduce bundle size.",
			guiOpts: {
				arrayType: "droppable",
				arrayGuiOpts: {
					supportedAssetTypes: [ProjectAssetTypeJavascript],
				},
			},
		},
		outputLocation: {
			type: "array",
			guiOpts: {
				arrayType: "string",
			},
		},
		usedAssets: {
			type: "array",
			tooltip: "A list of assets that are expected to be loaded. Unused asset types are stripped from the asset loader in order to reduce bundle size.",
			guiOpts: {
				arrayType: "droppable",
			},
		},
		includeAll: {
			type: "boolean",
			tooltip: "When set, the generated services script includes all code that can possibly be generated, regardless of what assets and entrypoints have been provided. This is useful during development, when you just want to quickly generate a services script without having to wait for the task to check which parts are needed. However, since this causes a lot of things to be imported, it is not advised to use this in production builds.",
		},
	});

	/**
	 * @override
	 * @param {import("./Task.js").RunTaskOptions<TaskGenerateServicesConfig>} options
	 */
	async runTask({config}) {
		if (!config) {
			throw new Error("Failed to run task: no config provided");
		}

		const assetManager = this.editorInstance.projectManager.assetManager;
		if (!assetManager) {
			throw new Error("Failed to run task: no asset manager.");
		}

		let entryPointContents = "";
		for (const entryPoint of config.entryPoints) {
			const asset = await assetManager.getProjectAssetFromUuid(entryPoint, {
				assertAssetType: ProjectAssetTypeJavascript,
			});
			if (asset) {
				const content = await asset.readAssetData();
				entryPointContents += content;
			}
		}

		const includeAll = config.includeAll || false;

		// TODO: This is a pretty primitive way of figuring out which services are needed, since we are
		// essentially just looking if some strings of text appear in one of the entry points.
		// Ideally we would parse the ast and figure out what is being used that way.
		// It would add a lot of complexity and wouldn't be able to handle all cases, but right now
		// if large files are used as entry points, the chance of these strings existing a pretty big so
		// there could be a lot of false positives.
		let needsAssetLoader = entryPointContents.includes("assetLoader") || includeAll;
		let needsEngineAssetsManager = entryPointContents.includes("engineAssetsManager") || includeAll;
		const needsRenderer = entryPointContents.includes("renderer") || includeAll;

		/** @type {Map<string, Set<string>>} */
		const collectedImports = new Map();
		/**
		 * @param {string} identifier
		 * @param {string} moduleSpecifier
		 */
		function addImport(identifier, moduleSpecifier) {
			let identifiers = collectedImports.get(moduleSpecifier);
			if (!identifiers) {
				identifiers = new Set();
				collectedImports.set(moduleSpecifier, identifiers);
			}
			identifiers.add(identifier);
		}

		/**
		 * A list of asset uuids that the engine requires to function.
		 * Assets in this list will automatically get bundled when the services
		 * script is generated as part of the 'build application' task.
		 * @type {Set<import("../../../../src/mod.js").UuidString>}
		 */
		const usedAssets = new Set();

		/**
		 * @typedef CollectedAssetLoaderType
		 * @property {string} instanceIdentifier
		 * @property {string} extra
		 * @property {boolean} returnInstanceIdentifier
		 */

		/** @type {Map<string, CollectedAssetLoaderType>} */
		const collectedAssetLoaderTypes = new Map();

		/** @type {Set<string>} */
		const collectedExportIdentifiers = new Set();

		if (needsAssetLoader) {
			/** @type {Map<import("../../assets/projectAssetType/ProjectAssetType.js").ProjectAssetTypeIdentifier, Set<import("../../assets/ProjectAsset.js").ProjectAssetAny>>} */
			const assetTypes = new Map();
			for await (const uuid of assetManager.collectAllAssetReferences(config.usedAssets)) {
				const asset = await assetManager.getProjectAssetFromUuid(uuid);
				if (asset?.assetType) {
					let assetsSet = assetTypes.get(asset.assetType);
					if (!assetsSet) {
						assetsSet = new Set();
						assetTypes.set(asset.assetType, assetsSet);
					}
					assetsSet.add(asset);
				}
			}

			if (includeAll) {
				for (const uuid of this.editorInstance.projectAssetTypeManager.getAssetTypeIds()) {
					if (!assetTypes.has(uuid)) {
						assetTypes.set(uuid, new Set());
					}
				}
			}

			for (const [assetTypeIdentifier, assets] of assetTypes) {
				const assetType = this.editorInstance.projectAssetTypeManager.getAssetType(assetTypeIdentifier);
				const config = assetType?.assetLoaderTypeImportConfig;
				if (config) {
					const moduleSpecifier = config.moduleSpecifier || "renda";
					addImport(config.identifier, moduleSpecifier);
					let extra = "";
					if (config.extra) {
						extra = await config.extra({
							editor: this.editorInstance,
							addImport,
							usedAssets: Array.from(assets),
							includeAll,
						});
					}
					collectedAssetLoaderTypes.set(config.identifier, {
						instanceIdentifier: config.instanceIdentifier || "",
						extra,
						returnInstanceIdentifier: config.returnInstanceIdentifier ?? true,
					});
				}
			}
		}

		if (needsRenderer) {
			addImport("WebGpuRenderer", "renda");
			needsEngineAssetsManager = true;
		}
		if (needsEngineAssetsManager) {
			addImport("EngineAssetsManager", "renda");
			needsAssetLoader = true;
		}
		if (needsAssetLoader) {
			addImport("AssetLoader", "renda");
		}

		// Script imports
		let code = "";
		for (const [moduleSpecifier, identifiers] of collectedImports) {
			code += `import {${Array.from(identifiers).join(", ")}} from "${moduleSpecifier}";\n`;
		}

		code += "\n";

		// Services instantiation
		code += "export function initializeServices() {\n";

		if (needsAssetLoader) {
			code += "	const assetLoader = new AssetLoader();\n";
			code += "\n";
			collectedExportIdentifiers.add("assetLoader");
			for (const [assetLoaderIdentifier, config] of collectedAssetLoaderTypes) {
				const registerCall = `assetLoader.registerLoaderType(${assetLoaderIdentifier});`;
				if (config.instanceIdentifier) {
					code += `	const ${config.instanceIdentifier} = ${registerCall}\n`;
					if (config.returnInstanceIdentifier) {
						collectedExportIdentifiers.add(config.instanceIdentifier);
					}
				} else {
					code += `	${registerCall}\n`;
				}
				if (config.extra) {
					const lines = config.extra.split("\n");
					for (const line of lines) {
						code += `	${line}\n`;
					}
				}
				code += "\n";
			}
		}

		if (needsEngineAssetsManager) {
			code += "	const engineAssetsManager = new EngineAssetsManager(assetLoader);\n";
			collectedExportIdentifiers.add("engineAssetsManager");
		}

		if (needsRenderer) {
			code += "	const renderer = new WebGpuRenderer(engineAssetsManager);\n";
			collectedExportIdentifiers.add("renderer");
			usedAssets.add(CLUSTER_BOUNDS_SHADER_ASSET_UUID);
			usedAssets.add(CLUSTER_LIGHTS_SHADER_ASSET_UUID);
		}

		// Return object
		code += `	return {${Array.from(collectedExportIdentifiers).join(", ")}};\n`;

		code += "}\n";

		/** @type {import("./Task.js").RunTaskReturn<TaskGenerateServicesCustomData>} */
		const result = {
			writeAssets: [
				{
					path: config.outputLocation,
					assetType: "renda:javascript",
					fileData: code,
				},
			],
			customData: {
				usedAssets: Array.from(usedAssets),
			},
		};
		return result;
	}
}
