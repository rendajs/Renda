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
 * @property {import("../../Editor.js").Editor} editor The editor instance.
 * @property {(identifier: string, moduleSpecifier: string) => void} addImport Call this function to add extra
 * imports to the top of the file. For example:
 * ```js
 * ctx.addImport("ShaderBuilder", "renda");
 * ```
 * will add `import {ShaderBuilder} from "renda";` to the top of the file.
 * @property {import("../../assets/ProjectAsset.js").ProjectAsset<TProjectAssetType>[]} usedAssets A list of assets that will have
 * been provided by the user in the task config. This list only contains the asset that are of the type related
 * to the current ProjectAssetType config.
 */

/** @extends {Task<TaskGenerateServicesConfig>} */
export class TaskGenerateServices extends Task {
	static uiName = "Generate Services";
	static type = "renda:generateServices";

	static configStructure = createTreeViewStructure({
		outputLocation: {
			type: "array",
			guiOpts: {
				arrayType: "string",
			},
		},
		usedAssets: {
			type: "array",
			guiOpts: {
				arrayType: "droppable",
			},
		},
	});

	/**
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
		 * @typedef CollectedAssetLoaderType
		 * @property {string} instanceIdentifier
		 * @property {string} extra
		 * @property {boolean} returnInstanceIdentifier
		 */

		/** @type {Map<string, CollectedAssetLoaderType>} */
		const collectedAssetLoaderTypes = new Map();

		/** @type {Set<string>} */
		const collectedExportIdentifiers = new Set();

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
					});
				}
				collectedAssetLoaderTypes.set(config.identifier, {
					instanceIdentifier: config.instanceIdentifier || "",
					extra,
					returnInstanceIdentifier: config.returnInstanceIdentifier ?? true,
				});
			}
		}

		const needsAssetLoader = collectedAssetLoaderTypes.size > 0;

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

		// Return object
		code += `	return {${Array.from(collectedExportIdentifiers).join(", ")}};\n`;

		code += "}\n";

		/** @type {import("./Task.js").RunTaskReturn} */
		const result = {
			writeAssets: [
				{
					path: config.outputLocation,
					assetType: "renda:javascript",
					fileData: code,
				},
			],
		};
		return result;
	}
}
