import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";
import {ProjectAsset} from "../../../../../../studio/src/assets/ProjectAsset.js";
import {injectMockStudioInstance} from "../../../../../../studio/src/studioInstance.js";
import {MemoryStudioFileSystem} from "../../../../../../studio/src/util/fileSystems/MemoryStudioFileSystem.js";
import {bundledAssetDataToArrayBufferOrString} from "../../../../../../studio/src/util/bundledAssetDataToArrayBufferOrString.js";

/**
 * @param {object} options
 * @param {import("../../../../../../studio/src/assets/AssetManager.js").AssetManager["getAssetUuidFromLiveAsset"]} [options.getAssetUuidFromLiveAssetImpl]
 * @param {import("../../../../../../studio/src/assets/AssetManager.js").AssetManager["getAssetUuidOrEmbeddedAssetDataFromLiveAsset"]} [options.getAssetUuidOrEmbeddedAssetDataFromLiveAssetImpl]
 * @param {import("../../../../../../studio/src/assets/AssetManager.js").AssetManager["getProjectAssetFromUuidOrEmbeddedAssetData"]} [options.getProjectAssetFromUuidOrEmbeddedAssetDataImpl]
 */
export function createMockDependencies({
	getAssetUuidFromLiveAssetImpl = () => null,
	getAssetUuidOrEmbeddedAssetDataFromLiveAssetImpl = () => null,
	getProjectAssetFromUuidOrEmbeddedAssetDataImpl = () => {
		throw new Error("getProjectAssetFromUuidOrEmbeddedAssetData not implemented");
	},
} = {}) {
	const studio = /** @type {import("../../../../../../studio/src/Studio.js").Studio} */ ({});

	const projectAsset = /** @type {import("../../../../../../studio/src/assets/ProjectAsset.js").ProjectAsset<any>} */ ({});

	const assetManager = /** @type {import("../../../../../../studio/src/assets/AssetManager.js").AssetManager} */ ({
		getAssetUuidFromLiveAsset(liveAsset) {
			return getAssetUuidFromLiveAssetImpl(liveAsset);
		},
		getAssetUuidOrEmbeddedAssetDataFromLiveAsset(liveAsset) {
			return getAssetUuidOrEmbeddedAssetDataFromLiveAssetImpl(liveAsset);
		},
		getProjectAssetFromUuidOrEmbeddedAssetData(uuidOrData, options) {
			return getProjectAssetFromUuidOrEmbeddedAssetDataImpl(uuidOrData, options);
		},
		getLiveAsset(uuid, assertionOptions) {},
		async getProjectAssetFromUuid(uuid, options) {
			return null;
		},
		entityAssetManager: {
			setLinkedAssetUuid(liveAsset, uuid) {},
		},
	});

	const assetTypeManager = /** @type {import("../../../../../../studio/src/assets/ProjectAssetTypeManager.js").ProjectAssetTypeManager} */ ({});

	const projectAssetTypeArgs = /** @type {const} */ ([
		studio,
		projectAsset,
		assetManager,
		assetTypeManager,
	]);

	return {
		studio,
		projectAsset,
		assetManager,
		assetTypeManager,
		projectAssetTypeArgs,
	};
}

export function getMockRecursionTracker() {
	return /** @type {import("../../../../../../studio/src/assets/liveAssetDataRecursionTracker/RecursionTracker.js").RecursionTracker} */ ({

	});
}

/**
 * This allows you to test both the serialization logic of a ProjectAssetType
 * as well as the buffer parsing logic of an AssetLoaderType.
 * This runs close to a full flow of:
 * - loading asset data from disk inside a project.
 * - serializing it to binary before it is bundled with other assets.
 * - deserializing it again to an object
 * - handling that data in the respective AssetLoaderType which turns it into an instance of a class.
 * @param {object} options
 * @param {import("../../../../../../studio/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetTypeConstructorAny} options.ProjectAssetTypeConstructor
 * @param {typeof import("../../../../../../src/assets/assetLoaderTypes/AssetLoaderType.js").AssetLoaderType<any, any>} options.AssetLoaderType
 * @param {any} [options.jsonFileData]
 */
export async function serializeAndLoad({
	ProjectAssetTypeConstructor,
	AssetLoaderType,
	jsonFileData,
}) {
	const castConstructor = /** @type {typeof import("../../../../../../studio/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetType} */ (ProjectAssetTypeConstructor);

	const mockAssetManager = /** @type {import("../../../../../../studio/src/assets/AssetManager.js").AssetManager} */ ({
		resolveDefaultAssetLinkUuid(uuid) {
			return uuid;
		},
		getDefaultAssetLink(uuid) {
			return null;
		},
		getProjectAssetFromUuidSync(uuid) {
			const mockProjectAsset = /** @type {import("../../../../../../studio/src/assets/ProjectAsset").ProjectAssetAny} */ ({
				uuid,
				async getIsDeleted() {
					return false;
				},
			});
			return /** @type {import("../../../../../../studio/src/assets/AssetManager.js").AssetAssertionOptionsToProjectAsset<{}>} */ (mockProjectAsset);
		},
	});

	const mockAssetTypeManager = /** @type {import("../../../../../../studio/src/assets/ProjectAssetTypeManager.js").ProjectAssetTypeManager} */ ({
		getAssetType(type) {
			if (type == castConstructor.type) {
				return castConstructor;
			}
			return null;
		},
	});

	const mockBuiltinAssetManager = /** @type {import("../../../../../../studio/src/assets/BuiltInAssetManager.js").BuiltInAssetManager} */ ({});

	const fs = new MemoryStudioFileSystem();

	const mockStudio = /** @type {import("../../../../../../studio/src/Studio.js").Studio} */ ({
		projectManager: {
			assetManager: mockAssetManager,
			assertAssetManagerExists() {
				return mockAssetManager;
			},
		},
		projectAssetTypeManager: mockAssetTypeManager,
		builtInAssetManager: mockBuiltinAssetManager,
	});

	/** @type {Map<import("../../../../../../src/mod.js").UuidString, symbol>} */
	const requestedAssetsFromAssetLoader = new Map();
	const mockAssetLoader = /** @type {import("../../../../../../src/mod.js").AssetLoader} */ ({
		async getAsset(uuid) {
			const symbol = Symbol(uuid);
			requestedAssetsFromAssetLoader.set(uuid, symbol);
			return symbol;
		},
	});
	const mockRecursionTracker = /** @type {import("../../../../../../src/assets/RecursionTracker").RecursionTracker} */ ({});

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
		 * @param {import("../../../../../../src/mod.js").UuidString} uuid
		 */
		getRequestedAsset(uuid) {
			const asset = requestedAssetsFromAssetLoader.get(uuid) || null;
			return /** @type {any} */ (asset);
		},
	};
}
