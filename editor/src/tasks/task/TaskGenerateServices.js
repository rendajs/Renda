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

		/** @type {Set<string>} */
		const collectedAssetLoaderTypes = new Set();

		/** @type {Set<string>} */
		const collectedExportIdentifiers = new Set();

		for (const assetTypeIdentifier of assetTypes) {
			const assetType = this.editorInstance.projectAssetTypeManager.getAssetType(assetTypeIdentifier);
			const config = assetType?.assetLoaderTypeImportConfig;
			if (config) {
				const moduleSpecifier = config.moduleSpecifier || "renda";
				addImport(config.identifier, moduleSpecifier);
				collectedAssetLoaderTypes.add(config.identifier);
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
			collectedExportIdentifiers.add("assetLoader");
			for (const assetLoaderType of collectedAssetLoaderTypes) {
				code += `	assetLoader.registerLoaderType(${assetLoaderType});\n`;
			}
		}

		code += "\n";

		// Return object
		code += `	return {${Array.from(collectedExportIdentifiers).join(", ")}};\n`;

		code += "}\n";

		await fileSystem.writeText(config.outputLocation, code);
	}
}
