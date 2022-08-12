import {createTreeViewStructure} from "../../ui/propertiesTreeView/createStructureHelpers.js";
import {Task} from "./Task.js";

/**
 * @typedef TaskGenerateServicesConfig
 * @property {import("../../util/fileSystems/EditorFileSystem.js").EditorFileSystemPath} outputLocation
 * @property {import("../../../../src/mod.js").UuidString[]} usedAssets A list of
 * asset uuids that are expected to be loaded. The task uses this list to determine
 * which asset loader types should be included. This way, loader types that are
 * not needed are not included when bundling with tree shaking enabled.
 */

/**
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
 * @property {(ctx: AssetLoaderTypeImportConfigExtraContext) => (Promise<string> | string)} [extra]
 * A function that gets called in which you can add extra content below the registration of the loader type.
 */

/**
 * @typedef AssetLoaderTypeImportConfigExtraContext
 * @property {(identifier: string, moduleSpecifier: string) => void} addImport Call this function to add extra
 * imports to the top of the file. For example:
 * ```js
 * ctx.addImport("ShaderBuilder", "renda");
 * ```
 * will add `import {ShaderBuilder} from "renda";` to the top of the file.
 */

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
	 * @param {TaskGenerateServicesConfig} config
	 */
	async runTask(config) {
		const fileSystem = this.editorInstance.projectManager.currentProjectFileSystem;
		if (!fileSystem) {
			throw new Error("Failed to run task: no project file system.");
		}
		const assetManager = this.editorInstance.projectManager.assetManager;
		if (!assetManager) {
			throw new Error("Failed to run task: no asset manager.");
		}

		/** @type {Set<import("../../assets/projectAssetType/ProjectAssetType.js").ProjectAssetTypeIdentifier>} */
		const assetTypes = new Set();
		for await (const uuid of assetManager.collectAllAssetReferences(config.usedAssets)) {
			const asset = await assetManager.getProjectAssetFromUuid(uuid);
			if (asset?.assetType) {
				assetTypes.add(asset.assetType);
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

		for (const assetTypeIdentifier of assetTypes) {
			const assetType = this.editorInstance.projectAssetTypeManager.getAssetType(assetTypeIdentifier);
			const config = assetType?.assetLoaderTypeImportConfig;
			if (config) {
				const moduleSpecifier = config.moduleSpecifier || "renda";
				addImport(config.identifier, moduleSpecifier);
				let extra = "";
				if (config.extra) {
					extra = await config.extra({
						addImport,
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

		await fileSystem.writeText(config.outputLocation, code);
	}
}
