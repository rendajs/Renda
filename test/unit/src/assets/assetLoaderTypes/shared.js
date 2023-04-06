import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";
import {ProjectAsset} from "../../../../../studio/src/assets/ProjectAsset.js";
import {injectMockStudioInstance} from "../../../../../studio/src/studioInstance.js";
import {MemoryStudioFileSystem} from "../../../../../studio/src/util/fileSystems/MemoryStudioFileSystem.js";
import {bundledAssetDataToArrayBufferOrString} from "../../../../../studio/src/tasks/task/TaskBundleAssets.js";

/**
 * This allows you to test both the serialization logic of a ProjectAssetType
 * as well as the buffer parsing logic of an AssetLoaderType.
 * @param {object} options
 * @param {import("../../../../../studio/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetTypeConstructorAny} options.ProjectAssetTypeConstructor
 * @param {typeof import("../../../../../src/assets/assetLoaderTypes/AssetLoaderType.js").AssetLoaderType} options.AssetLoaderType
 * @param {any} [options.jsonFileData]
 */
export async function serializeAndLoad({
	ProjectAssetTypeConstructor,
	AssetLoaderType,
	jsonFileData,
}) {
	const castConstructor = /** @type {typeof import("../../../../../studio/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetType} */ (ProjectAssetTypeConstructor);

	const mockAssetManager = /** @type {import("../../../../../studio/src/assets/AssetManager.js").AssetManager} */ ({
		resolveDefaultAssetLinkUuid(uuid) {
			return uuid;
		},
		getDefaultAssetLink(uuid) {
			return null;
		},
		getProjectAssetFromUuidSync(uuid) {
			const mockProjectAsset = /** @type {import("../../../../../studio/src/assets/ProjectAsset").ProjectAssetAny} */ ({
				uuid,
				async getIsDeleted() {
					return false;
				},
			});
			return /** @type {import("../../../../../studio/src/assets/AssetManager.js").AssetAssertionOptionsToProjectAsset<{}>} */ (mockProjectAsset);
		},
	});

	const mockAssetTypeManager = /** @type {import("../../../../../studio/src/assets/ProjectAssetTypeManager.js").ProjectAssetTypeManager} */ ({
		getAssetType(type) {
			if (type == castConstructor.type) {
				return castConstructor;
			}
			return null;
		},
	});

	const mockBuiltinAssetManager = /** @type {import("../../../../../studio/src/assets/BuiltInAssetManager.js").BuiltInAssetManager} */ ({});

	const fs = new MemoryStudioFileSystem();

	const mockStudio = /** @type {import("../../../../../studio/src/Studio.js").Studio} */ ({
		projectManager: {
			assetManager: mockAssetManager,
			assertAssetManagerExists() {
				return mockAssetManager;
			},
		},
		projectAssetTypeManager: mockAssetTypeManager,
		builtInAssetManager: mockBuiltinAssetManager,
	});

	/** @type {Map<import("../../../../../src/mod.js").UuidString, symbol>} */
	const requestedAssetsFromAssetLoader = new Map();
	const mockAssetLoader = /** @type {import("../../../../../src/mod.js").AssetLoader} */ ({
		async getAsset(uuid) {
			const symbol = Symbol(uuid);
			requestedAssetsFromAssetLoader.set(uuid, symbol);
			return symbol;
		},
	});
	const mockRecursionTracker = /** @type {import("../../../../../src/assets/RecursionTracker").RecursionTracker} */ ({});

	const assetFilePath = ["asset"];

	if (jsonFileData) {
		fs.writeJson(assetFilePath, jsonFileData);
	}

	injectMockStudioInstance(mockStudio);
	installFakeDocument();

	const referencedAssetUuids = [];
	let loadResult;

	try {
		// Bundle/serialize the asset
		const projectAsset = new ProjectAsset(mockAssetManager, mockAssetTypeManager, mockBuiltinAssetManager, fs, {
			uuid: "project asset uuid",
			assetType: castConstructor.type,
			path: assetFilePath,
		});

		for await (const uuid of projectAsset.getReferencedAssetUuids()) {
			referencedAssetUuids.push(uuid);
		}
		const bundledAssetData = await projectAsset.getBundledAssetData();

		// Load the asset
		const bufferOrString = await bundledAssetDataToArrayBufferOrString(bundledAssetData);

		let buffer;
		if (typeof bufferOrString == "string") {
			// Normally the string would get written to a file and then read again as buffer.
			// But since we are not writing to a file, we'll have to convert the string to a buffer first.
			buffer = new TextEncoder().encode(bufferOrString);
		} else {
			buffer = bufferOrString;
		}

		const loaderType = new AssetLoaderType(mockAssetLoader);
		loadResult = await loaderType.parseBuffer(buffer, mockRecursionTracker, undefined);
	} finally {
		injectMockStudioInstance(null);
		uninstallFakeDocument();
	}

	return {
		referencedAssetUuids,
		loadResult,
		/**
		 * Returns the asset that would have been loaded by the AssetLoader if it has been called.
		 * Normally this gets called when the asset you're trying to load loads sub-assets.
		 * If no call has been made to `AssetLoader.getAsset`, this will return null.
		 * @param {import("../../../../../src/mod.js").UuidString} uuid
		 */
		getRequestedAsset(uuid) {
			const asset = requestedAssetsFromAssetLoader.get(uuid) || null;
			return /** @type {any} */ (asset);
		},
	};
}
